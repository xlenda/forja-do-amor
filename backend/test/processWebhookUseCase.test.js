// Testa a dedupe de reentrega de webhook (achado real de auditoria,
// 18/07/2026) — repositório fake em memória, sem tocar no SQLite real.
const test = require("node:test");
const assert = require("node:assert/strict");
const { ProcessWebhookUseCase } = require("../src/application/ProcessWebhookUseCase");
const { Subscription } = require("../src/domain/Subscription");

function makeFakeRepository(initialSub) {
  const subscriptions = new Map([[initialSub.correlationCode, initialSub]]);
  const processedEvents = new Set();
  const events = [];
  return {
    findByCorrelationCode: (code) => subscriptions.get(code) || null,
    save: (sub) => subscriptions.set(sub.correlationCode, sub),
    logEvent: (e) => events.push(e),
    wasEventProcessed: (eventId) => (eventId ? processedEvents.has(eventId) : false),
    markEventProcessed: (eventId) => {
      if (eventId) processedEvents.add(eventId);
    },
    _events: events,
  };
}

function makeFakeProvider(parsedEvent) {
  return {
    verifyWebhookSignature: () => true,
    parseWebhookEvent: () => parsedEvent,
  };
}

function makeActiveSub() {
  return new Subscription({
    id: "cc1", correlationCode: "cc1", status: "active", provider: "hotmart",
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  });
}

test("evento com eventId novo processa normalmente e marca como processado", () => {
  const repo = makeFakeRepository(makeActiveSub());
  const provider = makeFakeProvider({ eventId: "evt-1", correlationCode: "cc1", status: "canceled", rawEvent: "PURCHASE_CANCELED" });
  const useCase = new ProcessWebhookUseCase(repo, provider);

  const result = useCase.execute({ rawBody: "", headers: {}, payload: { id: "evt-1" } });

  assert.equal(result.ok, true);
  assert.equal(result.status, "canceled");
  assert.equal(repo.findByCorrelationCode("cc1").status, "canceled");
});

test("mesmo eventId reentregue não reaplica a transição (dedupe real)", () => {
  const repo = makeFakeRepository(makeActiveSub());
  const provider = makeFakeProvider({ eventId: "evt-1", correlationCode: "cc1", status: "canceled", rawEvent: "PURCHASE_CANCELED" });
  const useCase = new ProcessWebhookUseCase(repo, provider);

  useCase.execute({ rawBody: "", headers: {}, payload: { id: "evt-1" } }); // primeira entrega
  // Simula uma reativação manual (fora do webhook) entre as duas entregas —
  // se a reentrega fosse reaplicada, ela reverteria isso incorretamente.
  const sub = repo.findByCorrelationCode("cc1");
  sub.status = "active";
  repo.save(sub);

  const secondResult = useCase.execute({ rawBody: "", headers: {}, payload: { id: "evt-1" } }); // reentrega idêntica

  assert.equal(secondResult.ok, true);
  assert.equal(secondResult.duplicate, true);
  assert.equal(repo.findByCorrelationCode("cc1").status, "active", "reentrega não deveria ter mexido no status");
});

test("evento sem eventId (payload atípico) ainda processa — não trava por falta de id", () => {
  const repo = makeFakeRepository(makeActiveSub());
  const provider = makeFakeProvider({ eventId: null, correlationCode: "cc1", status: "canceled", rawEvent: "PURCHASE_CANCELED" });
  const useCase = new ProcessWebhookUseCase(repo, provider);

  const result = useCase.execute({ rawBody: "", headers: {}, payload: {} });

  assert.equal(result.ok, true);
  assert.equal(result.status, "canceled");
});
