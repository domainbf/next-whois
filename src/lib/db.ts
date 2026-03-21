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
 *
 * Priority:
 *   1. POSTGRES_URL_NON_POOLING  – Vercel/Supabase direct connection (port 5432).
 *                                   Best for DDL; no pooler restrictions.
 *   2. DATABASE_URL              – Local dev or manually configured DB.
 *   3. POSTGRES_URL              – Supabase transaction pooler (port 6543).
 *                                   Appends pgbouncer=true automatically.
 *
 * POSTGRES_URL_NON_POOLING is intentionally preferred over DATABASE_URL so that
 * Vercel deployments always reach Supabase even when DATABASE_URL happens to be
 * set to a Replit-internal host (e.g. "helium") that is unreachable externally.
 */
function getConnectionString(): { url: string; source: string } | null {
  if (process.env.POSTGRES_URL_NON_POOLING) {
    return { url: process.env.POSTGRES_URL_NON_POOLING, source: "POSTGRES_URL_NON_POOLING" };
  }
  if (process.env.DATABASE_URL) {
    return { url: process.env.DATABASE_URL, source: "DATABASE_URL" };
  }
  if (process.env.POSTGRES_URL) {
    const raw = process.env.POSTGRES_URL;
    const sep = raw.includes("?") ? "&" : "?";
    const url = raw.includes("pgbouncer") ? raw : `${raw}${sep}pgbouncer=true`;
    return { url, source: "POSTGRES_URL (pooler)" };
  }
  return null;
}

/** Extract just the host:port from a connection URL for safe logging (no credentials). */
export function getConnectionHost(): string {
  const cs = getConnectionString();
  if (!cs) return "none";
  try {
    const u = new URL(cs.url);
    return `${u.hostname}:${u.port || 5432}`;
  } catch {
    return "unknown";
  }
}

/** Which env var is being used for the database connection. */
export function getConnectionSource(): string {
  return getConnectionString()?.source ?? "none";
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
    console.error("[db] No database URL found. Set DATABASE_URL or connect Supabase via the Vercel integration (POSTGRES_URL / POSTGRES_URL_NON_POOLING).");
    return null;
  }
  console.log(`[db] Using ${cs.source} → ${getConnectionHost()}`);
  pool = makePool(cs.url);
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
