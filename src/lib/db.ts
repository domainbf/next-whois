import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __pgMigrated: boolean | undefined;
}

declare global {
  // eslint-disable-next-line no-var
  var __pgMigrating: Promise<void> | undefined;
}

function getPool(): Pool | null { return global.__pgPool ?? null; }
function setPool(p: Pool | null) { global.__pgPool = p ?? undefined; }
function getMigrated(): boolean { return global.__pgMigrated ?? false; }
function setMigrated(v: boolean) { global.__pgMigrated = v; }

const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id                    VARCHAR(16)  PRIMARY KEY,
    email                 TEXT         UNIQUE NOT NULL,
    password_hash         TEXT         NOT NULL,
    name                  TEXT,
    disabled              BOOLEAN      NOT NULL DEFAULT false,
    admin_notes           TEXT,
    avatar_color          TEXT,
    email_verified        BOOLEAN      NOT NULL DEFAULT false,
    email_verify_token    TEXT,
    email_verify_expires  TIMESTAMPTZ,
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
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
    user_id         VARCHAR(16)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url             TEXT         NOT NULL,
    click_count     INTEGER      NOT NULL DEFAULT 0,
    last_clicked_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, url)
  )`,
  `CREATE TABLE IF NOT EXISTS search_history (
    id              VARCHAR(16)  PRIMARY KEY,
    user_id         VARCHAR(16)  REFERENCES users(id) ON DELETE CASCADE,
    query           TEXT         NOT NULL,
    query_type      TEXT         NOT NULL DEFAULT 'domain',
    reg_status      TEXT,
    expiration_date TEXT,
    remaining_days  INTEGER,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
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
  `CREATE TABLE IF NOT EXISTS site_settings (
    key        TEXT         PRIMARY KEY,
    value      TEXT         NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS tld_fallback_stats (
    tld           TEXT         PRIMARY KEY,
    fail_count    INTEGER      NOT NULL DEFAULT 0,
    use_fallback  BOOLEAN      NOT NULL DEFAULT false,
    rdap_skip     BOOLEAN      NOT NULL DEFAULT false,
    last_fail_at  TIMESTAMPTZ
  )`,
  `ALTER TABLE tld_fallback_stats ADD COLUMN IF NOT EXISTS rdap_skip BOOLEAN NOT NULL DEFAULT false`,
  `CREATE TABLE IF NOT EXISTS custom_whois_servers (
    tld        TEXT         PRIMARY KEY,
    entry      JSONB        NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS rate_limit_records (
    key        TEXT         PRIMARY KEY,
    count      INTEGER      NOT NULL DEFAULT 0,
    reset_at   TIMESTAMPTZ  NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sponsors (
    id           VARCHAR(16)  PRIMARY KEY,
    name         TEXT         NOT NULL,
    avatar_url   TEXT,
    amount       NUMERIC(10,2),
    currency     TEXT         NOT NULL DEFAULT 'CNY',
    message      TEXT,
    sponsor_date DATE,
    is_anonymous BOOLEAN      NOT NULL DEFAULT false,
    is_visible   BOOLEAN      NOT NULL DEFAULT true,
    platform     TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS invite_codes (
    id           VARCHAR(16)  PRIMARY KEY,
    code         TEXT         UNIQUE NOT NULL,
    description  TEXT,
    is_active    BOOLEAN      NOT NULL DEFAULT true,
    max_uses     INTEGER      NOT NULL DEFAULT 1,
    use_count    INTEGER      NOT NULL DEFAULT 0,
    created_by   VARCHAR(16)  REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,
];

const ALTER_COLUMNS = [
  `ALTER TABLE reminders    ADD COLUMN IF NOT EXISTS phase_flags          TEXT`,
  `ALTER TABLE search_history ADD COLUMN IF NOT EXISTS reg_status         TEXT`,
  `ALTER TABLE search_history ADD COLUMN IF NOT EXISTS expiration_date    TEXT`,
  `ALTER TABLE search_history ADD COLUMN IF NOT EXISTS remaining_days     INTEGER`,
  `ALTER TABLE search_history ALTER COLUMN user_id                        DROP NOT NULL`,
  `ALTER TABLE users         ADD COLUMN IF NOT EXISTS disabled            BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE users         ADD COLUMN IF NOT EXISTS admin_notes         TEXT`,
  `ALTER TABLE users         ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `ALTER TABLE users         ADD COLUMN IF NOT EXISTS avatar_color        TEXT`,
  `ALTER TABLE users         ADD COLUMN IF NOT EXISTS email_verified      BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE users         ADD COLUMN IF NOT EXISTS email_verify_token  TEXT`,
  `ALTER TABLE users         ADD COLUMN IF NOT EXISTS email_verify_expires TIMESTAMPTZ`,
  `ALTER TABLE users         ADD COLUMN IF NOT EXISTS subscription_access BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE users         ADD COLUMN IF NOT EXISTS invite_code_used    TEXT`,
];

function getConnectionString(): { url: string; source: string } | null {
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
    max: 3,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 20000,
    allowExitOnIdle: true,
  });
  p.on("error", (err) => console.error("[db] pool error:", err.message));
  return p;
}

export function getDb(): Pool | null {
  const existing = getPool();
  if (existing) return existing;
  const cs = getConnectionString();
  if (!cs) {
    console.error("[db] No PostgreSQL connection URL found. Set POSTGRES_URL_NON_POOLING as a secret.");
    return null;
  }
  console.log(`[db] Connecting via ${cs.source} → ${getConnectionHost()}`);
  const p = makePool(cs.url);
  setPool(p);
  setMigrated(false);
  return p;
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
        // Column may already exist — ignore
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
  if (getMigrated()) return db;

  if (global.__pgMigrating) {
    await global.__pgMigrating;
    return db;
  }

  global.__pgMigrating = runMigrations(db).then(() => {
    setMigrated(true);
    global.__pgMigrating = undefined;
  });

  await global.__pgMigrating;
  return db;
}
