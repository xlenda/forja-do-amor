// Camada de domínio: entidade de assinatura + máquina de estados.
// Nenhuma dependência de infraestrutura ou de processador de pagamento aqui.

const STATUSES = ["pending", "active", "past_due", "canceled", "expired"];

// "expired" precisa ser alcançável a partir de "active"/"pending"/"canceled"
// porque é para lá que HotmartPaymentProvider mapeia PURCHASE_REFUNDED e
// PURCHASE_CHARGEBACK (ver mapStatus) — sem essas transições, um reembolso
// ou chargeback chegando pra uma assinatura "active" (o caso mais comum)
// lançava "Transição inválida" dentro de transitionTo(), e
// ProcessWebhookUseCase.execute() capturava isso e devolvia {ok:true,
// ignored:true} pro Hotmart — silenciosamente, sem nunca revogar o acesso do
// cliente estornado. Achado real de auditoria de segurança (18/07/2026).
const TRANSITIONS = {
  pending: ["active", "canceled", "expired"],
  active: ["past_due", "canceled", "expired"],
  past_due: ["active", "expired", "canceled"],
  canceled: ["active", "expired"],
  expired: ["active"],
};

function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

class Subscription {
  constructor({
    id,
    correlationCode,
    coupleName,
    status,
    provider,
    providerSubscriptionId,
    plan,
    amountCents,
    currency,
    currentPeriodEnd,
    customerEmail,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.correlationCode = correlationCode;
    this.coupleName = coupleName;
    this.status = status;
    this.provider = provider;
    this.providerSubscriptionId = providerSubscriptionId;
    this.plan = plan;
    this.amountCents = amountCents;
    this.currency = currency;
    this.currentPeriodEnd = currentPeriodEnd;
    this.customerEmail = customerEmail;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // Lança erro em transição ilegal — protege o estado contra eventos fora de ordem.
  transitionTo(newStatus) {
    if (this.status === newStatus) return;
    if (!canTransition(this.status, newStatus)) {
      throw new Error(`Transição inválida: ${this.status} -> ${newStatus}`);
    }
    this.status = newStatus;
    this.updatedAt = new Date().toISOString();
  }

  // "past_due" ainda mantém acesso — é a janela de dunning antes de expirar de vez.
  hasAccess() {
    return this.status === "active" || this.status === "past_due";
  }
}

module.exports = { Subscription, STATUSES, canTransition };
