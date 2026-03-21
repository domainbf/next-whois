import { Pool } from "pg";

let pool: Pool | null = null;
let migrated = false;

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id           VARCHAR(16)  PRIMARY KEY,
    email        TEXT         UNIQUE NOT NULL,
    password_hash TEXT        NOT NULL,
    name         TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,
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
 * Resolve the Supabase connection string.
 *
 * Only Supabase env vars injected by the Vercel integration are accepted:
 *   1. POSTGRES_URL_NON_POOLING  – direct connection (port 5432), best for DDL.
 *   2. POSTGRES_URL              – transaction pooler (port 6543), pgbouncer=true
 *                                  is appended automatically.
 *
 * DATABASE_URL (Replit internal DB) is intentionally ignored.
 */
function getConnectionString(): { url: string; source: string } | null {
  if (process.env.POSTGRES_URL_NON_POOLING) {
    return { url: process.env.POSTGRES_URL_NON_POOLING, source: "POSTGRES_URL_NON_POOLING" };
  }
  if (process.env.POSTGRES_URL) {
    const raw = process.env.POSTGRES_URL;
    const sep = raw.includes("?") ? "&" : "?";
    const url = raw.includes("pgbouncer") ? raw : `${raw}${sep}pgbouncer=true`;
    return { url, source: "POSTGRES_URL (pooler)" };
  }
  return null;
}

/** Extract just the host:port from the connection URL for safe logging (no credentials). */
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

/**
 * Strip `sslmode` from the connection URL so that the ssl option we set on
 * Pool (rejectUnauthorized: false) is the sole authority. Supabase URLs
 * sometimes carry sslmode=verify-full which would override our setting and
 * reject the certificate chain.
 */
function stripSslMode(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("sslmode");
    return u.toString();
  } catch {
    return url;
  }
}

function makePool(connectionString: string): Pool {
  const cleanUrl = stripSslMode(connectionString);
  const p = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
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
    console.error(
      "[db] No Supabase URL found. Set POSTGRES_URL_NON_POOLING (or POSTGRES_URL) " +
      "via the Vercel → Supabase integration, or add them manually in environment variables."
    );
    return null;
  }
  console.log(`[db] Connecting via ${cs.source} → ${getConnectionHost()}`);
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
 * Returns null when no Supabase URL is configured.
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
