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

/**
 * Resolve the best available connection string.
 * Priority: DATABASE_URL → POSTGRES_URL_NON_POOLING → POSTGRES_URL
 *
 * Vercel's native Supabase integration injects POSTGRES_URL (transaction pooler,
 * port 6543) and POSTGRES_URL_NON_POOLING (direct connection, port 5432).
 * We prefer the direct connection because it supports DDL without restrictions.
 * When only POSTGRES_URL (pooler) is available we append pgbouncer=true so the
 * pg driver disables prepared statements (required by Supabase's PgBouncer).
 */
function getConnectionString(): string | null {
  const direct =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
  if (direct) return direct;

  const pooler = process.env.POSTGRES_URL;
  if (pooler) {
    // Supabase transaction pooler requires pgbouncer=true
    const sep = pooler.includes("?") ? "&" : "?";
    return pooler.includes("pgbouncer") ? pooler : `${pooler}${sep}pgbouncer=true`;
  }

  return null;
}

function makePool(connectionString: string): Pool {
  const isLocal =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1");
  const p = new Pool({
    connectionString,
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
  if (pool) return pool;
  const cs = getConnectionString();
  if (!cs) {
    console.error("[db] No database URL found. Set DATABASE_URL or connect Supabase via Vercel integration (POSTGRES_URL).");
    return null;
  }
  pool = makePool(cs);
  migrated = false;
  return pool;
}

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

/**
 * Returns the pool after ensuring all tables exist.
 * Call this in every API handler before running queries.
 * Returns null when no database is configured.
 * Throws when the database is reachable but migration fails.
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
