const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "forja.sqlite"));
db.pragma("journal_mode = WAL");
// Sem isso, duas conexões concorrentes nesse mesmo arquivo (processo
// principal + scripts/backup-db.js + scripts/send-daily-push.js +
// scripts/send-streak-risk-push.js, todos via cron) colidindo numa escrita
// recebem SQLITE_BUSY na hora (busy_timeout padrão é 0) em vez de esperar a
// outra conexão liberar — no processo principal isso vira um 500 real pra
// uma colisão que se resolveria sozinha esperando poucos ms.
db.pragma("busy_timeout = 5000");

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

-- Dedupe de reentrega de webhook (Hotmart pode reenviar a mesma notificação
-- mais de uma vez) — sem isso, uma reentrega fora de ordem podia, em tese,
-- reaplicar uma transição já processada (ex.: reativar algo já cancelado
-- manualmente depois). event_id é o "id" (UUID) do envelope do webhook.
CREATE TABLE IF NOT EXISTS webhook_events_processed (
  event_id TEXT PRIMARY KEY,
  processed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  sign_name TEXT,
  sign_icon TEXT,
  created_at TEXT NOT NULL
);

-- Feed social só pra usuários solo (sem parceiro pareado) — Reconectar/Agir
-- e o resto do conteúdo de casal continuam privados, nunca aparecem aqui.
-- user_id é o "sub" (UUID) do JWT do Supabase, verificado via JWKS (ver
-- src/http/socialAuth.js) — nunca confiamos num user_id vindo cru do client.
CREATE TABLE IF NOT EXISTS social_profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_emoji TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS social_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  reading_type TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_social_posts_created ON social_posts(created_at);

CREATE TABLE IF NOT EXISTS social_follows (
  follower_id TEXT NOT NULL,
  followee_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (follower_id, followee_id)
);

CREATE TABLE IF NOT EXISTS social_likes (
  post_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS social_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_social_comments_post ON social_comments(post_id);
`);
// ↑ Baseline congelado (user_version=0) — daqui pra frente, TODA mudança de
// schema vira um arquivo numerado em migrations/, nunca uma edição deste
// bloco nem um ALTER TABLE manual via SSH (ver migrations/README.md).
// Achado real de auditoria (18/07/2026): sem isso, o primeiro ALTER TABLE
// numa tabela com dado real (ex.: subscriptions, dinheiro de assinante)
// ficaria sem versionamento nem registro do que foi feito.

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

function runMigrations() {
  const currentVersion = db.pragma("user_version", { simple: true });
  if (!fs.existsSync(MIGRATIONS_DIR)) return;

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  for (const file of files) {
    const version = parseInt(file, 10);
    if (version <= currentVersion) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const applyMigration = db.transaction(() => {
      db.exec(sql);
      db.pragma(`user_version = ${version}`);
    });
    applyMigration();
    console.log(`[migrations] aplicada: ${file} (user_version=${version})`);
  }
}
runMigrations();

module.exports = { db };
