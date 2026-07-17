// Dispara o Web Push diário pra todo mundo inscrito — chamado 1x/dia via
// crontab no servidor (ver instruções de deploy). Roda fora do processo
// principal do Express (pm2 "forja-backend"): é um script avulso, não um
// endpoint HTTP, porque cron é o jeito mais simples de agendar "1x por dia"
// sem manter um scheduler em memória dentro do processo de sempre-ligado.
// Espera ser chamado como `node --env-file=.env scripts/send-daily-push.js`
// (mesma convenção do `npm start` deste projeto — ver package.json), então
// não depende do pacote dotenv, que não é uma dependência daqui.
const webpush = require("web-push");
const { PushSubscriptionRepository } = require("../src/infrastructure/PushSubscriptionRepository");
const { getTodaysThought } = require("../src/infrastructure/dailyThoughtContent");

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "";

async function main() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error("[send-daily-push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configurados — abortando.");
    process.exitCode = 1;
    return;
  }
  webpush.setVapidDetails(VAPID_SUBJECT || "mailto:contato@cosmicguide.cloud", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const repository = new PushSubscriptionRepository();
  const subscriptions = repository.all();
  console.log(`[send-daily-push] ${subscriptions.length} inscrição(ões) encontrada(s).`);

  let sent = 0;
  let removed = 0;
  let failed = 0;

  for (const row of subscriptions) {
    const personalSign = row.sign_name ? { name: row.sign_name, icon: row.sign_icon } : null;
    const body = getTodaysThought(personalSign);
    const payload = JSON.stringify({ title: "✨ Pensamento cósmico do dia", body });

    const pushSubscription = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };

    try {
      await webpush.sendNotification(pushSubscription, payload);
      sent++;
    } catch (err) {
      // 404/410 = inscrição não existe mais no navegador (ex.: a pessoa
      // desinstalou/limpou dados) — limpa do banco pra não tentar de novo
      // amanhã. Qualquer outro erro só loga e segue pra próxima pessoa.
      if (err.statusCode === 404 || err.statusCode === 410) {
        repository.remove(row.endpoint);
        removed++;
      } else {
        failed++;
        console.error(`[send-daily-push] falha ao enviar (endpoint ${row.endpoint.slice(0, 40)}...):`, err.message);
      }
    }
  }

  console.log(`[send-daily-push] concluído: ${sent} enviado(s), ${removed} inscrição(ões) expirada(s) removida(s), ${failed} falha(s).`);
}

main();
