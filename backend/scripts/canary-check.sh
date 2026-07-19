#!/bin/bash
# Canary do forja-backend (Cosmic Guide + funil Forja del Amor) — vai além do
# healthcheck.sh (que só confirma o processo respondendo): testa uma chamada
# de IA REAL e o CORS real, porque um pm2 "online" + /health 200 não pega
# nada disso — foi exatamente assim que o crédito Anthropic zerado passou
# despercebido até alguém ler o log manualmente (18/07/2026).
#
# Uso: ./canary-check.sh          (roda via cron, só notifica em transição ok->fail)
#      ./canary-check.sh --once   (roda uma vez, imprime relatório, sempre, sem notificar)
set -u
PORT="${FORJA_PORT:-3005}"
BASE="http://127.0.0.1:${PORT}"
STATE_FILE="/root/forja-backend/canary-state"
LOG="/root/forja-backend/canary.log"
MODE="${1:-cron}"

FAILURES=()
report() { echo "  [$1] $2"; }

# 1. Health básico (processo respondendo)
if curl -sf -m 5 "${BASE}/health" > /dev/null; then
  report OK "health"
else
  FAILURES+=("health: /health não respondeu")
  report FALHOU "health"
fi

# 2. Chamada de IA real — pega crédito esgotado/chave inválida, que /health nunca detectaria.
CHAT_RESP=$(curl -s -m 15 -X POST -H 'Content-Type: application/json' \
  -d '{"personaId":"luna","message":"oi","history":[]}' "${BASE}/api/chat")
if echo "$CHAT_RESP" | grep -qi 'credit balance\|invalid_request_error\|IA não configurada'; then
  FAILURES+=("ia: /api/chat com erro real: $(echo "$CHAT_RESP" | head -c 200)")
  report FALHOU "ia (crédito/config)"
elif echo "$CHAT_RESP" | grep -q '"reply"'; then
  report OK "ia"
else
  FAILURES+=("ia: /api/chat resposta inesperada: $(echo "$CHAT_RESP" | head -c 200)")
  report FALHOU "ia (resposta inesperada)"
fi

# 3. CORS do domínio real do app — bug real já ocorrido (17/07/2026).
CORS_HEADER=$(curl -s -m 5 -D - -o /dev/null -H 'Origin: https://cosmicguide.cloud' "${BASE}/health" | grep -i 'access-control-allow-origin' | tr -d '\r')
if echo "$CORS_HEADER" | grep -q 'cosmicguide.cloud'; then
  report OK "cors"
else
  FAILURES+=("cors: header ausente/errado pra https://cosmicguide.cloud (got: ${CORS_HEADER:-<vazio>})")
  report FALHOU "cors"
fi

TIMESTAMP=$(date -u +%FT%TZ)

if [ "$MODE" = "--once" ]; then
  echo "=== Canary forja-backend — ${TIMESTAMP} ==="
  if [ ${#FAILURES[@]} -eq 0 ]; then
    echo "Tudo saudável (health, IA real, CORS)."
  else
    echo "${#FAILURES[@]} problema(s):"
    for f in "${FAILURES[@]}"; do echo "  - $f"; done
  fi
  exit 0
fi

# Modo cron: só notifica na TRANSIÇÃO ok->fail (evita floodar o dashboard com
# a mesma task repetida a cada execução enquanto o problema persiste).
PREV_STATE="ok"
[ -f "$STATE_FILE" ] && PREV_STATE=$(cat "$STATE_FILE")

if [ ${#FAILURES[@]} -gt 0 ]; then
  echo "fail" > "$STATE_FILE"
  echo "${TIMESTAMP} [canary] FALHOU: ${FAILURES[*]}" >> "$LOG"
  if [ "$PREV_STATE" != "fail" ]; then
    DESC=$(printf '%s; ' "${FAILURES[@]}")
    curl -s -X POST http://localhost:3001/tasks \
      -H 'Content-Type: application/json' \
      -d "{\"title\":\"Canary FAIL — forja-backend\",\"description\":\"${DESC//\"/\\\"}\",\"niche\":\"cosmic-guide\",\"status\":\"blocked\",\"priority\":\"high\"}" \
      >> "$LOG" 2>&1
  fi
else
  echo "ok" > "$STATE_FILE"
  if [ "$PREV_STATE" = "fail" ]; then
    echo "${TIMESTAMP} [canary] recuperado (voltou a ok)" >> "$LOG"
  fi
fi
