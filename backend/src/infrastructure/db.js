const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "forja.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS subscriptions (
  correlation_code TEXT PRIMARY KEY,
  couple_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL,
  provider_subscription_id TEXT,
  plan TEXT,
  amount_cents INTEGER,
  currency TEXT,
  current_period_end TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscription_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  correlation_code TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  raw_event TEXT,
  raw_payload TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  sign_name TEXT,
  sign_icon TEXT,
  created_at TEXT NOT NULL
);
`);

module.exports = { db };
