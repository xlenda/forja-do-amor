// Dispara "sua sequência está em risco" pra quem tem streak ativo mas ainda
// não fez nada hoje — 1x/dia via crontab, à noite (horário local aproximado),
// mesmo padrão do send-daily-push.js. Depende de lib/streak.js (no app) ter
// sincronizado current_streak/last_active_date via /api/push/sync-streak
// sempre que recordActiveDay() roda — sem isso, a coluna fica sempre vazia e
// ninguém recebe (silencioso, não é um erro).
const webpush = require("web-push");
const { PushSubscriptionRepository } = require("../src/infrastructure/PushSubscriptionRepository");

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "";

function todayUtc() {
  // Mesma definição de "hoje" que lib/streak.js usa no app
  // (date.toISOString().slice(0,10), também UTC) — precisa bater os dois
  // lados pra "last_active_date !== hoje" significar a mesma coisa.
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error("[send-streak-risk-push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configurados — abortando.");
    process.exitCode = 1;
    return;
  }
  webpush.setVapidDetails(VAPID_SUBJECT || "mailto:contato@cosmicguide.cloud", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const repository = new PushSubscriptionRepository();
  const today = todayUtc();
  const atRisk = repository.all().filter((row) => row.current_streak > 0 && row.last_active_date !== today);
  console.log(`[send-streak-risk-push] ${atRisk.length} inscrição(ões) com sequência em risco hoje (${today}).`);

  let sent = 0;
  let removed = 0;
  let failed = 0;

  for (const row of atRisk) {
    const dias = row.current_streak === 1 ? "1 dia" : `${row.current_streak} dias`;
    const payload = JSON.stringify({
      title: "🔥 Sua sequência está em risco",
      body: `Você está há ${dias} seguidos — não deixe acabar hoje. Uma leitura rápida já mantém viva.`,
    });
    const pushSubscription = { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } };

    try {
      await webpush.sendNotification(pushSubscription, payload);
      sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        repository.remove(row.endpoint);
        removed++;
      } else {
        failed++;
        console.error(`[send-streak-risk-push] falha ao enviar (endpoint ${row.endpoint.slice(0, 40)}...):`, err.message);
      }
    }
  }

  console.log(`[send-streak-risk-push] concluído: ${sent} enviado(s), ${removed} inscrição(ões) expirada(s) removida(s), ${failed} falha(s).`);
}

main();
