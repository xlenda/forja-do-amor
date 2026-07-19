// Testa a verificação de assinatura do webhook (segurança) e o mapeamento de
// eventos Hotmart -> vocabulário interno (dinheiro real depende disso).
const test = require("node:test");
const assert = require("node:assert/strict");
const { HotmartPaymentProvider } = require("../src/infrastructure/HotmartPaymentProvider");

function makeProvider(hottok = "segredo-123") {
  return new HotmartPaymentProvider({ hottok, offerCode: "oferta-x" });
}

test("verifyWebhookSignature aceita o token correto (header lowercase)", () => {
  const provider = makeProvider("segredo-123");
  assert.equal(provider.verifyWebhookSignature("", { "x-hotmart-hottok": "segredo-123" }), true);
});

test("verifyWebhookSignature rejeita token incorreto", () => {
  const provider = makeProvider("segredo-123");
  assert.equal(provider.verifyWebhookSignature("", { "x-hotmart-hottok": "errado" }), false);
});

test("verifyWebhookSignature rejeita token de tamanho diferente sem lançar erro", () => {
  const provider = makeProvider("segredo-123");
  assert.doesNotThrow(() => provider.verifyWebhookSignature("", { "x-hotmart-hottok": "curto" }));
  assert.equal(provider.verifyWebhookSignature("", { "x-hotmart-hottok": "curto" }), false);
});

test("verifyWebhookSignature rejeita quando o header não veio", () => {
  const provider = makeProvider("segredo-123");
  assert.equal(provider.verifyWebhookSignature("", {}), false);
});

test("parseWebhookEvent: ACTIVE e STARTED viram active", () => {
  const provider = makeProvider();
  for (const subscriptionStatus of ["ACTIVE", "STARTED"]) {
    const result = provider.parseWebhookEvent({ data: { subscription: { status: subscriptionStatus } } });
    assert.equal(result.status, "active", subscriptionStatus);
  }
});

test("parseWebhookEvent: OVERDUE vira past_due (janela de dunning)", () => {
  const provider = makeProvider();
  const result = provider.parseWebhookEvent({ data: { subscription: { status: "OVERDUE" } } });
  assert.equal(result.status, "past_due");
});

test("parseWebhookEvent: as 3 variantes de cancelamento viram canceled", () => {
  const provider = makeProvider();
  for (const subscriptionStatus of ["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_SELLER", "CANCELLED_BY_ADMIN"]) {
    const result = provider.parseWebhookEvent({ data: { subscription: { status: subscriptionStatus } } });
    assert.equal(result.status, "canceled", subscriptionStatus);
  }
});

test("parseWebhookEvent: PURCHASE_APPROVED sem subscription.status ainda vira active", () => {
  const provider = makeProvider();
  const result = provider.parseWebhookEvent({ event: "PURCHASE_APPROVED", data: {} });
  assert.equal(result.status, "active");
});

test("parseWebhookEvent: PURCHASE_REFUNDED/CHARGEBACK/EXPIRED viram expired", () => {
  const provider = makeProvider();
  for (const event of ["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "PURCHASE_EXPIRED"]) {
    const result = provider.parseWebhookEvent({ event, data: {} });
    assert.equal(result.status, "expired", event);
  }
});

test("parseWebhookEvent: evento desconhecido sem status de assinatura vira null (nunca inventa status)", () => {
  const provider = makeProvider();
  const result = provider.parseWebhookEvent({ event: "PURCHASE_OUT_OF_SHOPPING_CART", data: {} });
  assert.equal(result.status, null);
});

test("parseWebhookEvent: extrai correlationCode, valor em centavos e currentPeriodEnd", () => {
  const provider = makeProvider();
  const result = provider.parseWebhookEvent({
    event: "PURCHASE_APPROVED",
    data: {
      purchase: {
        origin: { xcod: "abc123" },
        price: { value: 49.9, currency_value: "BRL" },
        transaction: "HP123",
      },
      subscription: { status: "ACTIVE", date_next_charge: "2026-08-06", subscriber: { code: "SUB1" } },
    },
  });
  assert.equal(result.correlationCode, "abc123");
  assert.equal(result.amountCents, 4990);
  assert.equal(result.currency, "BRL");
  assert.equal(result.currentPeriodEnd, "2026-08-06");
  assert.equal(result.providerSubscriptionId, "SUB1");
});

test("parseWebhookEvent: extrai eventId do envelope (id de notificação, pra dedupe de reentrega)", () => {
  const provider = makeProvider();
  const result = provider.parseWebhookEvent({ id: "0d7aa966-b887-4617-8c56-9e865bfc8ce4", event: "PURCHASE_APPROVED", data: {} });
  assert.equal(result.eventId, "0d7aa966-b887-4617-8c56-9e865bfc8ce4");
});

test("parseWebhookEvent: sem id no payload, eventId vira null (nunca fabrica um id)", () => {
  const provider = makeProvider();
  const result = provider.parseWebhookEvent({ event: "PURCHASE_APPROVED", data: {} });
  assert.equal(result.eventId, null);
});
