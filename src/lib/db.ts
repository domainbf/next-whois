import { Pool } from "pg";

let pool: Pool | null = null;
let initPromise: Promise<void> | null = null;

async function runMigrations(db: Pool): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS stamps (
      id           VARCHAR(16)  PRIMARY KEY,
      domain       TEXT         NOT NULL,
      tag_name     TEXT         NOT NULL,
      tag_style    TEXT         NOT NULL DEFAULT 'personal',
      link         TEXT,
      description  TEXT,
      nickname     TEXT         NOT NULL,
      email        TEXT         NOT NULL,
      verify_token TEXT         NOT NULL,
      verified     BOOLEAN      NOT NULL DEFAULT false,
      verified_at  TIMESTAMPTZ,
      created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS reminders (
      id              VARCHAR(16)  PRIMARY KEY,
      domain          TEXT         NOT NULL,
      email           TEXT         NOT NULL,
      expiration_date TEXT,
      active          BOOLEAN      NOT NULL DEFAULT true,
      cancel_token    TEXT,
      cancelled_at    TIMESTAMPTZ,
      cancel_reason   TEXT,
      days_before     INTEGER      DEFAULT 30,
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS reminder_logs (
      id          VARCHAR(16)  PRIMARY KEY,
      reminder_id TEXT         NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
      days_before INTEGER      NOT NULL,
      sent_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      UNIQUE (reminder_id, days_before)
    );
  `);
  console.log("[db] Schema ready");
}

export function getDb(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    const isLocal =
      process.env.DATABASE_URL.includes("localhost") ||
      process.env.DATABASE_URL.includes("127.0.0.1");
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
    initPromise = runMigrations(pool).catch((err) => {
      console.error("[db] Migration error:", err.message);
      initPromise = null;
    });
  }
  return pool;
}

/**
 * Returns the pool after ensuring all tables have been created.
 * Always use this in API handlers instead of getDb() directly.
 */
export async function getDbReady(): Promise<Pool | null> {
  const db = getDb();
  if (!db) return null;
  if (initPromise) await initPromise;
  return db;
}
