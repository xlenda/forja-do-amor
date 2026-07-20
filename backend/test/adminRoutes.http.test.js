// Teste HTTP de ponta a ponta das rotas de suporte/admin contra o Express e
// o SQLite reais (DATA_DIR isolado em diretório temporário) — antes nenhum
// teste exercitava socialRoutes.js/adminRoutes.js de verdade, então os bugs
// de segurança já corrigidos nesta sessão (timing-safe compare do
// ADMIN_TOKEN, máquina de estados mesmo sob override manual) não tinham
// nenhuma rede de regressão. Achado real de auditoria (19/07/2026).
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "forja-test-admin-"));
process.env.DATA_DIR = TEST_DATA_DIR;
process.env.HOTMART_HOTTOK = "test-hottok-secret";
process.env.HOTMART_OFFER_CODE = "test-offer-code";
process.env.ALLOWED_ORIGIN = "http://localhost";
process.env.ADMIN_TOKEN = "test-admin-token-1234";

const test = require("node:test");
const assert = require("node:assert/strict");
const supertest = require("supertest");
const { app } = require("../src/http/server");

test.after(() => {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

async function createPendingSubscription(customerEmail) {
  const res = await supertest(app).post("/api/checkout/initiate").send({ customerEmail });
  return res.body.correlationCode;
}

test("sem X-Admin-Token, rotas admin devolvem 401", async () => {
  const code = await createPendingSubscription("ana@example.com");
  const res = await supertest(app).get(`/api/admin/subscriptions/${code}`);
  assert.equal(res.status, 401);
});

test("com X-Admin-Token errado, rotas admin devolvem 401", async () => {
  const code = await createPendingSubscription("ana@example.com");
  const res = await supertest(app).get(`/api/admin/subscriptions/${code}`).set("X-Admin-Token", "token-errado");
  assert.equal(res.status, 401);
});

test("busca por e-mail encontra a assinatura real criada no checkout", async () => {
  const code = await createPendingSubscription("bruno@example.com");
  const res = await supertest(app)
    .get("/api/admin/subscriptions/search?email=bruno@example.com")
    .set("X-Admin-Token", "test-admin-token-1234");
  assert.equal(res.status, 200);
  assert.ok(res.body.subscriptions.some((s) => s.correlationCode === code));
});

test("busca por correlationCode desconhecido devolve 404", async () => {
  const res = await supertest(app)
    .get("/api/admin/subscriptions/nao-existe")
    .set("X-Admin-Token", "test-admin-token-1234");
  assert.equal(res.status, 404);
});

test("força transição válida (pending -> active) e reflete no status público", async () => {
  const code = await createPendingSubscription("carla@example.com");
  const res = await supertest(app)
    .post(`/api/admin/subscriptions/${code}/status`)
    .set("X-Admin-Token", "test-admin-token-1234")
    .send({ status: "active", reason: "cliente confirmou pagamento por e-mail" });
  assert.equal(res.status, 200);
  assert.equal(res.body.subscription.status, "active");

  const status = await supertest(app).get(`/api/subscription/${code}`);
  assert.equal(status.body.status, "active");
});

test("mesmo com override admin, transição impossível na máquina de estados é rejeitada (409)", async () => {
  const code = await createPendingSubscription("daniela@example.com");
  // pending -> expired é válido, mas expired -> past_due NÃO é (TRANSITIONS em Subscription.js)
  await supertest(app)
    .post(`/api/admin/subscriptions/${code}/status`)
    .set("X-Admin-Token", "test-admin-token-1234")
    .send({ status: "expired", reason: "teste" });

  const res = await supertest(app)
    .post(`/api/admin/subscriptions/${code}/status`)
    .set("X-Admin-Token", "test-admin-token-1234")
    .send({ status: "past_due", reason: "teste" });
  assert.equal(res.status, 409);
});

test("status fora da lista de STATUSES devolve 400", async () => {
  const code = await createPendingSubscription("elis@example.com");
  const res = await supertest(app)
    .post(`/api/admin/subscriptions/${code}/status`)
    .set("X-Admin-Token", "test-admin-token-1234")
    .send({ status: "isso-nao-existe", reason: "teste" });
  assert.equal(res.status, 400);
});

test("sem reason, devolve 400 (motivo é obrigatório pro histórico)", async () => {
  const code = await createPendingSubscription("fabio@example.com");
  const res = await supertest(app)
    .post(`/api/admin/subscriptions/${code}/status`)
    .set("X-Admin-Token", "test-admin-token-1234")
    .send({ status: "active" });
  assert.equal(res.status, 400);
});
