import { pool } from "../../db.js";

// Repository = data access only: SQL in, rows out. No business rules, no req/res.
// The users table belongs to the users module, so only `sessions` lives here.

async function createSession(id: string, userId: number, expiresAt: Date) {
  await pool.query(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
    [id, userId, expiresAt],
  );
}

// Safe to repeat: deleting a row that is already gone is fine.
async function deleteSession(id: string) {
  await pool.query("DELETE FROM sessions WHERE id = $1", [id]);
}

async function findActiveSession(id: string) {
  const { rows } = await pool.query(
    "SELECT user_id FROM sessions WHERE id = $1 AND expires_at > now()",
    [id],
  );
  return rows[0] ?? null;
}

export const authRepository = {
  createSession,
  deleteSession,
  findActiveSession,
};
