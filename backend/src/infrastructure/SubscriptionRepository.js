const crypto = require("crypto");
const { db } = require("./db");
const { Subscription } = require("../domain/Subscription");

// Token gerado SEMPRE no servidor (nunca no navegador) — é o que liga o casal ao
// pagamento sem precisar de conta/senha. Se fosse gerado no cliente, qualquer um
// conseguiria forjar um código e ganhar acesso sem pagar.
function generateCorrelationCode() {
  return crypto.randomBytes(16).toString("hex");
}

function toEntity(row) {
  if (!row) return null;
  return new Subscription({
    id: row.correlation_code,
    correlationCode: row.correlation_code,
    coupleName: row.couple_name,
    status: row.status,
    provider: row.provider,
    providerSubscriptionId: row.provider_subscription_id,
    plan: row.plan,
    amountCents: row.amount_cents,
    currency: row.currency,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

class SubscriptionRepository {
  // Chamado ao iniciar o checkout — cria o registro em "pending" antes de qualquer pagamento existir.
  createPending({ coupleName, provider, plan, amountCents, currency }) {
    const correlationCode = generateCorrelationCode();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO subscriptions (correlation_code, couple_name, status, provider, plan, amount_cents, currency, created_at, updated_at)
      VALUES (@correlationCode, @coupleName, 'pending', @provider, @plan, @amountCents, @currency, @now, @now)
    `).run({ correlationCode, coupleName: coupleName || null, provider, plan: plan || null, amountCents: amountCents || null, currency: currency || null, now });
    return this.findByCorrelationCode(correlationCode);
  }

  findByCorrelationCode(correlationCode) {
    const row = db.prepare("SELECT * FROM subscriptions WHERE correlation_code = ?").get(correlationCode);
    return toEntity(row);
  }

  save(subscription) {
    db.prepare(`
      UPDATE subscriptions
      SET status = @status, provider_subscription_id = @providerSubscriptionId,
          amount_cents = COALESCE(@amountCents, amount_cents),
          currency = COALESCE(@currency, currency),
          current_period_end = COALESCE(@currentPeriodEnd, current_period_end), updated_at = @updatedAt
      WHERE correlation_code = @correlationCode
    `).run({
      status: subscription.status,
      providerSubscriptionId: subscription.providerSubscriptionId || null,
      amountCents: subscription.amountCents || null,
      currency: subscription.currency || null,
      currentPeriodEnd: subscription.currentPeriodEnd || null,
      updatedAt: new Date().toISOString(),
      correlationCode: subscription.correlationCode,
    });
  }

  logEvent({ correlationCode, fromStatus, toStatus, rawEvent, rawPayload }) {
    db.prepare(`
      INSERT INTO subscription_events (correlation_code, from_status, to_status, raw_event, raw_payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(correlationCode, fromStatus || null, toStatus || null, rawEvent || null, JSON.stringify(rawPayload || null), new Date().toISOString());
  }

  // Dedupe de reentrega de webhook — Hotmart pode reenviar a mesma
  // notificação mais de uma vez (achado real de auditoria, 18/07/2026).
  wasEventProcessed(eventId) {
    if (!eventId) return false; // sem id no payload, não dá pra deduplicar — segue o fluxo normal
    return !!db.prepare("SELECT 1 FROM webhook_events_processed WHERE event_id = ?").get(eventId);
  }

  markEventProcessed(eventId) {
    if (!eventId) return;
    db.prepare("INSERT OR IGNORE INTO webhook_events_processed (event_id, processed_at) VALUES (?, ?)").run(eventId, new Date().toISOString());
  }
}

module.exports = { SubscriptionRepository };
