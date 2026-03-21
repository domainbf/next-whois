import { Pool } from "pg";

let pool: Pool | null = null;
let migrated = false;

const TABLES = [
  `CREATE TABLE IF NOT EXISTS stamps (
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
  )`,
  `CREATE TABLE IF NOT EXISTS reminders (
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
  )`,
  `CREATE TABLE IF NOT EXISTS reminder_logs (
    id          VARCHAR(16)  PRIMARY KEY,
    reminder_id TEXT         NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
    days_before INTEGER      NOT NULL,
    sent_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (reminder_id, days_before)
  )`,
];

export async function runMigrations(db: Pool): Promise<void> {
  const client = await db.connect();
  try {
    for (const sql of TABLES) {
      await client.query(sql);
    }
    console.log("[db] Schema ready");
  } finally {
    client.release();
  }
}

function makePool(): Pool {
  const url = process.env.DATABASE_URL!;
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  const p = new Pool({
    connectionString: url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 3,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    allowExitOnIdle: false,
  });
  p.on("error", (err) => console.error("[db] pool error:", err.message));
  return p;
}

export function getDb(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = makePool();
    migrated = false;
  }
  return pool;
}

/**
 * Returns the pool after ensuring all tables exist.
 * Runs migration once per process lifetime; retries if it previously failed.
 * Returns null if DATABASE_URL is missing.
 * Throws if migration itself fails — callers' try/catch handles it.
 */
export async function getDbReady(): Promise<Pool | null> {
  const db = getDb();
  if (!db) return null;
  if (!migrated) {
    await runMigrations(db);
    migrated = true;
  }
  return db;
}
