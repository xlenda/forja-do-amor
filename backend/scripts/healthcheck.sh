#!/bin/bash
# Healthcheck + self-heal do backend Forja del Amor, via cron.
# PM2 (autorestart:true) já cobre o processo morrendo/crashando; isso aqui
# cobre o caso do processo vivo mas travado sem responder — um GET /health
# real, não só "pm2 diz que tá online".
PORT="${FORJA_PORT:-3005}"
LOG="/root/forja-backend/healthcheck.log"
APP="forja-backend"

if curl -sf -m 5 "http://127.0.0.1:${PORT}/health" > /dev/null; then
  exit 0
fi

echo "$(date -u +%FT%TZ) [healthcheck] /health falhou, reiniciando ${APP}" >> "$LOG"
pm2 restart "$APP" >> "$LOG" 2>&1
