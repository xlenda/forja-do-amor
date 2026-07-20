# Migrations do forja-backend

## Regra
Nenhuma alteração de schema é aplicada manualmente em produção (nunca `ALTER TABLE` direto via SSH). Toda mudança de schema — mesmo "só" um `ADD COLUMN` — vira um arquivo novo aqui, nunca uma edição do bloco `CREATE TABLE IF NOT EXISTS` original em `db.js` (esse bloco é o baseline congelado, `user_version=0`).

## Como criar uma migration nova
1. Crie `NNN_descricao.sql` (3 dígitos, sequencial, maior que o último já existente).
2. Escreva o SQL. É aplicado dentro de uma transação — se falhar no meio, nada é commitado.
3. Teste local primeiro contra uma cópia do `forja.sqlite` de produção (`node scripts/backup-db.js` já gera uma).
4. No deploy, o runner em `db.js` aplica automaticamente qualquer migration com número maior que o `PRAGMA user_version` atual, na inicialização do processo (`pm2 restart` já dispara isso).

## Limitações do SQLite (diferente de Postgres/MySQL)
- **Adicionar coluna simples**: `ALTER TABLE x ADD COLUMN y TEXT` funciona direto, mas SÓ com default constante (`TEXT`, `INTEGER DEFAULT 0`) — não aceita expressão computada como default.
- **Remover coluna, mudar tipo, ou renomear com constraint**: SQLite não suporta isso direto (`DROP COLUMN` só existe em versões recentes com limitações). Padrão seguro: criar tabela nova com o schema certo, copiar os dados (`INSERT INTO nova SELECT ... FROM antiga`), `DROP TABLE antiga`, `ALTER TABLE nova RENAME TO antiga`. Sempre dentro da mesma transação.
- **Índice novo**: `CREATE INDEX IF NOT EXISTS` é seguro de rodar mesmo se já existir.

## Backup antes de migration com dado real em jogo
`scripts/backup-db.js` já existe e usa a API de backup online do better-sqlite3 (seguro mesmo com o banco recebendo escrita em WAL). Rode antes de qualquer migration que toque uma tabela com dado de produção real (ex.: `subscriptions`).
