const { Pool } = require("pg");

const TABLES = [
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
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_user_tool_clicks_user ON user_tool_clicks(user_id)`,
];

async function migrate() {
  const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!url) {
    console.log("[migrate] No DB URL — skipping");
    return;
  }

  let cleanUrl = url;
  try {
    const u = new URL(url);
    u.searchParams.delete("sslmode");
    cleanUrl = u.toString();
  } catch {}

  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 15000,
  });

  const client = await pool.connect();
  try {
    for (const sql of TABLES) {
      await client.query(sql);
    }
    console.log("[migrate] Schema ready");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("[migrate] Failed:", err.message);
  process.exit(1);
});
