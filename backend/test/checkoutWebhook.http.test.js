// Teste HTTP de ponta a ponta do caminho de dinheiro (checkout + webhook)
// contra o Express real e o SQLite real (DATA_DIR isolado num diretório
// temporário, apagado depois) — os testes existentes de
// InitiateCheckoutUseCase/ProcessWebhookUseCase só usam repositório fake em
// Map(), então um erro de SQL de verdade (coluna errada, bind de tipo errado
// após uma migração) só apareceria em produção. Achado real de auditoria
// (19/07/2026).
//
// DATA_DIR precisa ser setado ANTES de qualquer require que puxe src/infrastructure/db.js
// (transitivamente, ao requerer ../src/http/server) — senão db.js já teria
// aberto o arquivo de produção.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "forja-test-checkout-"));
process.env.DATA_DIR = TEST_DATA_DIR;
process.env.HOTMART_HOTTOK = "test-hottok-secret";
process.env.HOTMART_OFFER_CODE = "test-offer-code";
process.env.ALLOWED_ORIGIN = "http://localhost";

const test = require("node:test");
const assert = require("node:assert/strict");
const supertest = require("supertest");
const { app } = require("../src/http/server");

function webhookPayload({ correlationCode, event, subscriptionStatus, amountValue = 5 }) {
  return {
    id: `evt-${event}-${correlationCode}-${Math.random().toString(36).slice(2)}`,
    event,
    data: {
      purchase: {
        origin: { xcod: correlationCode },
        price: { value: amountValue, currency_value: "USD" },
      },
      subscription: { status: subscriptionStatus },
    },
  };
}

test.after(() => {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

test("POST /api/checkout/initiate cria uma assinatura pending real no SQLite", async () => {
  const res = await supertest(app).post("/api/checkout/initiate").send({});
  assert.equal(res.status, 200);
  assert.equal(typeof res.body.correlationCode, "string");
  assert.equal(res.body.checkoutConfig.offerCode, "test-offer-code");
  assert.equal(res.body.checkoutConfig.xcod, res.body.correlationCode);

  const status = await supertest(app).get(`/api/subscription/${res.body.correlationCode}`);
  assert.equal(status.status, 200);
  assert.equal(status.body.status, "pending");
  assert.equal(status.body.hasAccess, false);
});

test("webhook com hottok correto ativa a assinatura (pending -> active) de verdade no banco", async () => {
  const initiate = await supertest(app).post("/api/checkout/initiate").send({});
  const { correlationCode } = initiate.body;

  const webhookRes = await supertest(app)
    .post("/webhook/hotmart")
    .set("x-hotmart-hottok", "test-hottok-secret")
    .send(webhookPayload({ correlationCode, event: "PURCHASE_APPROVED", subscriptionStatus: "ACTIVE" }));

  assert.equal(webhookRes.status, 200);
  assert.equal(webhookRes.body.ok, true);
  assert.equal(webhookRes.body.status, "active");

  const status = await supertest(app).get(`/api/subscription/${correlationCode}`);
  assert.equal(status.body.status, "active");
  assert.equal(status.body.hasAccess, true);
});

test("webhook com hottok errado é rejeitado e não muda o status real da assinatura", async () => {
  const initiate = await supertest(app).post("/api/checkout/initiate").send({});
  const { correlationCode } = initiate.body;

  const webhookRes = await supertest(app)
    .post("/webhook/hotmart")
    .set("x-hotmart-hottok", "token-errado")
    .send(webhookPayload({ correlationCode, event: "PURCHASE_APPROVED", subscriptionStatus: "ACTIVE" }));

  assert.equal(webhookRes.status, 200); // sempre 200 pro Hotmart não reentregar — motivo vai no body
  assert.equal(webhookRes.body.ok, false);

  const status = await supertest(app).get(`/api/subscription/${correlationCode}`);
  assert.equal(status.body.status, "pending"); // nunca ativou
});

test("GET /api/subscription/:code desconhecido devolve 404", async () => {
  const res = await supertest(app).get("/api/subscription/codigo-que-nao-existe");
  assert.equal(res.status, 404);
});

test("reembolso (PURCHASE_REFUNDED) revoga acesso de uma assinatura ativa de verdade no banco", async () => {
  const initiate = await supertest(app).post("/api/checkout/initiate").send({});
  const { correlationCode } = initiate.body;
  await supertest(app)
    .post("/webhook/hotmart")
    .set("x-hotmart-hottok", "test-hottok-secret")
    .send(webhookPayload({ correlationCode, event: "PURCHASE_APPROVED", subscriptionStatus: "ACTIVE" }));

  const refundRes = await supertest(app)
    .post("/webhook/hotmart")
    .set("x-hotmart-hottok", "test-hottok-secret")
    .send(webhookPayload({ correlationCode, event: "PURCHASE_REFUNDED", subscriptionStatus: undefined }));

  assert.equal(refundRes.body.ok, true);
  assert.equal(refundRes.body.status, "expired");

  const status = await supertest(app).get(`/api/subscription/${correlationCode}`);
  assert.equal(status.body.status, "expired");
  assert.equal(status.body.hasAccess, false);
});
