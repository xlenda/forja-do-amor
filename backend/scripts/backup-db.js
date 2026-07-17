// Backup do SQLite de produção via API nativa do better-sqlite3 (db.backup()),
// que usa o backup online do próprio SQLite — seguro pra copiar mesmo com o
// banco em modo WAL e recebendo escritas ao vivo (diferente de um `cp` cru do
// arquivo .sqlite, que pode capturar um estado inconsistente no meio de uma
// transação). Ver node_modules/better-sqlite3/lib/methods/backup.js.
//
// Uso: node scripts/backup-db.js  (chamado via cron no servidor, ver
// bug-audit-workflow / new-app-playbook skill para o padrão de operação).
const path = require("path");
const fs = require("fs");
const { db } = require("../src/infrastructure/db");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const RETENTION_DAYS = 14;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function pruneOldBackups() {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith("forja-") && f.endsWith(".sqlite"));
  for (const file of files) {
    const fullPath = path.join(BACKUP_DIR, file);
    const stat = fs.statSync(fullPath);
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(fullPath);
      console.log(`[backup-db] removido backup antigo: ${file}`);
    }
  }
}

async function main() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const dest = path.join(BACKUP_DIR, `forja-${timestamp()}.sqlite`);
  await db.backup(dest);
  const sizeKb = Math.round(fs.statSync(dest).size / 1024);
  console.log(`[backup-db] backup criado: ${dest} (${sizeKb}kb)`);

  pruneOldBackups();
  db.close();
}

main().catch((err) => {
  console.error("[backup-db] falhou:", err.message);
  process.exitCode = 1;
});
