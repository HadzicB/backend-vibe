import pg from "pg";

const { Client, Pool } = pg;

const config = { host: "localhost", port: 5432, user: "boha1704" };
const DB_NAME = "practice";

// 1. Create the database if it doesn't exist
async function ensureDatabase() {
  const admin = new Client({ ...config, database: "postgres" });
  await admin.connect();
  const { rowCount } = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [DB_NAME],
  );
  if (rowCount === 0) await admin.query(`CREATE DATABASE ${DB_NAME}`);
  await admin.end();
}

// 2. One shared pool for the whole app
const pool = new Pool({ ...config, database: DB_NAME });

// 3. Create tables if they don't exist
async function initDb() {
  await ensureDatabase();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      login_count   INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  // One user has many addresses (1:N). The coordinates come from the geocoder.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS addresses (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label        TEXT,
      street       TEXT,
      house_number TEXT,
      postal_code  TEXT,
      city         TEXT NOT NULL,
      region       TEXT,
      country      TEXT NOT NULL,
      country_code TEXT,
      latitude     DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
      longitude    DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  // The exact line the user picked in the search dropdown. Added after the table
  // first shipped, and CREATE TABLE IF NOT EXISTS cannot add columns, hence ALTER.
  await pool.query(
    "ALTER TABLE addresses ADD COLUMN IF NOT EXISTS display_name TEXT",
  );

  // Postgres does not index foreign keys by itself, and every query filters by user_id
  await pool.query(
    "CREATE INDEX IF NOT EXISTS addresses_user_id_idx ON addresses (user_id)",
  );
}

export { initDb, pool };
