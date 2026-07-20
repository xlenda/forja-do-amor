const { db } = require("./db");

class PushSubscriptionRepository {
  // Chamado toda vez que o app se inscreve — se o endpoint já existir (pessoa
  // reabriu o site e o navegador devolveu a mesma inscrição), apenas atualiza
  // o signo pessoal salvo, sem duplicar a linha.
  save({ endpoint, p256dh, auth, signName, signIcon }) {
    db.prepare(`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, sign_name, sign_icon, created_at)
      VALUES (@endpoint, @p256dh, @auth, @signName, @signIcon, @now)
      ON CONFLICT(endpoint) DO UPDATE SET
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        sign_name = excluded.sign_name,
        sign_icon = excluded.sign_icon
    `).run({
      endpoint,
      p256dh,
      auth,
      signName: signName || null,
      signIcon: signIcon || null,
      now: new Date().toISOString(),
    });
  }

  remove(endpoint) {
    db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
  }

  all() {
    return db.prepare("SELECT * FROM push_subscriptions").all();
  }

  // Sincroniza o estado real de sequência (lib/streak.js, AsyncStorage local)
  // pro servidor poder decidir quem notificar à noite (achado real de
  // auditoria/melhoria, 19/07/2026). Silenciosamente ignora se o endpoint não
  // existir (ex.: inscrição já removida) — nunca lança, quem chama trata como
  // fire-and-forget.
  updateStreak({ endpoint, lastActiveDate, currentStreak }) {
    db.prepare(
      "UPDATE push_subscriptions SET last_active_date = ?, current_streak = ? WHERE endpoint = ?"
    ).run(lastActiveDate, currentStreak, endpoint);
  }
}

module.exports = { PushSubscriptionRepository };
