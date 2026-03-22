import { Pool } from "pg";

let pool: Pool | null = null;
let migrated = false;

const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id           VARCHAR(16)  PRIMARY KEY,
    email        TEXT         UNIQUE NOT NULL,
    password_hash TEXT        NOT NULL,
    name         TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id           VARCHAR(16)  PRIMARY KEY,
    user_id      VARCHAR(16)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token        TEXT         UNIQUE NOT NULL,
    expires_at   TIMESTAMPTZ  NOT NULL,
    used         BOOLEAN      NOT NULL DEFAULT false,
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
    phase_flags     TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS reminder_logs (
    id          VARCHAR(16)  PRIMARY KEY,
    reminder_id TEXT         NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
    days_before INTEGER      NOT NULL,
    sent_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (reminder_id, days_before)
  )`,
  `CREATE TABLE IF NOT EXISTS tool_clicks (
    url          TEXT         PRIMARY KEY,
    total_clicks INTEGER      NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS user_tool_clicks (
    user_id      VARCHAR(16)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url          TEXT         NOT NULL,
    click_count  INTEGER      NOT NULL DEFAULT 0,
    last_clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, url)
  )`,
  `CREATE TABLE IF NOT EXISTS search_history (
    id           VARCHAR(16)  PRIMARY KEY,
    user_id      VARCHAR(16)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query        TEXT         NOT NULL,
    query_type   TEXT         NOT NULL DEFAULT 'domain',
    reg_status   TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS feedback (
    id           VARCHAR(16)  PRIMARY KEY,
    query        TEXT         NOT NULL,
    query_type   TEXT,
    issue_types  TEXT         NOT NULL,
    description  TEXT,
    email        TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,
];

const ALTER_COLUMNS = [
  `ALTER TABLE reminders ADD COLUMN IF NOT EXISTS phase_flags TEXT`,
  `ALTER TABLE search_history ADD COLUMN IF NOT EXISTS reg_status TEXT`,
];

function getConnectionString(): { url: string; source: string } | null {
  // Prefer POSTGRES_URL (Supabase Session Pooler, IPv4-reachable) over the direct
  // non-pooling address which is IPv6-only and unreachable from Replit.
  if (process.env.POSTGRES_URL) {
    return { url: process.env.POSTGRES_URL, source: "POSTGRES_URL" };
  }
  if (process.env.POSTGRES_URL_NON_POOLING) {
    return { url: process.env.POSTGRES_URL_NON_POOLING, source: "POSTGRES_URL_NON_POOLING" };
  }
  return null;
}

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

export function getConnectionSource(): string {
  return getConnectionString()?.source ?? "none";
}

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
    max: 5,
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
    console.error("[db] No PostgreSQL connection URL found. Set POSTGRES_URL_NON_POOLING as a secret.");
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
    for (const sql of CREATE_TABLES) {
      await client.query(sql);
    }
    for (const sql of ALTER_COLUMNS) {
      try {
        await client.query(sql);
      } catch {
        // Column may already exist with different syntax on older PG — ignore
      }
    }
    console.log("[db] Schema ready");
  } finally {
    client.release();
  }
}

export async function getDbReady(): Promise<Pool | null> {
  const db = getDb();
  if (!db) return null;
  if (!migrated) {
    await runMigrations(db);
    migrated = true;
  }
  return db;
}
