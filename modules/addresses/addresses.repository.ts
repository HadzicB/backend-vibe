import { pool } from "../../db.js";

// Repository = data access only: SQL in, rows out. No business rules, no req/res.
// Every query filters by user_id: a user can only ever touch their own rows.

export type AddressInput = {
  label: string | null;
  displayName: string | null; // the line the user picked, null for older rows
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string;
  region: string | null;
  country: string;
  countryCode: string | null;
  latitude: number;
  longitude: number;
};

// Aliases turn snake_case columns into the camelCase the API returns
const ADDRESS_COLUMNS = `id, label, display_name AS "displayName", street,
  house_number AS "houseNumber", postal_code AS "postalCode", city, region,
  country, country_code AS "countryCode", latitude, longitude,
  created_at AS "createdAt"`;

async function listByUser(userId: number) {
  const { rows } = await pool.query(
    `SELECT ${ADDRESS_COLUMNS} FROM addresses WHERE user_id = $1 ORDER BY created_at, id`,
    [userId],
  );
  return rows;
}

// count(*) is a bigint, which pg returns as a string, so cast it
async function countByUser(userId: number) {
  const { rows } = await pool.query(
    "SELECT count(*)::int AS count FROM addresses WHERE user_id = $1",
    [userId],
  );
  return rows[0].count as number;
}

async function create(userId: number, a: AddressInput) {
  const { rows } = await pool.query(
    `INSERT INTO addresses
       (user_id, label, display_name, street, house_number, postal_code, city,
        region, country, country_code, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING ${ADDRESS_COLUMNS}`,
    [
      userId,
      a.label,
      a.displayName,
      a.street,
      a.houseNumber,
      a.postalCode,
      a.city,
      a.region,
      a.country,
      a.countryCode,
      a.latitude,
      a.longitude,
    ],
  );
  return rows[0];
}

// true if a row was deleted. A row owned by someone else counts as "not found".
async function deleteOwned(id: number, userId: number) {
  const { rowCount } = await pool.query(
    "DELETE FROM addresses WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  return (rowCount ?? 0) > 0;
}

export const addressesRepository = {
  listByUser,
  countByUser,
  create,
  deleteOwned,
};
