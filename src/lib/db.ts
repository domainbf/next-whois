import { Pool } from "pg";

let pool: Pool | null = null;

export function getDb(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    const isLocal = process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("127.0.0.1");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      allowExitOnIdle: false,
    });
    pool.on("error", (err) => {
      console.error("[db] Unexpected pool client error:", err.message);
    });
  }
  return pool;
}
