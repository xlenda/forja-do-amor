// Testa a máquina de estados de assinatura — dinheiro real depende disso
// (acesso liberado/bloqueado). Usa node:test (Node 18+), sem dependência nova.
const test = require("node:test");
const assert = require("node:assert/strict");
const { Subscription, canTransition, STATUSES } = require("../src/domain/Subscription");

function makeSub(status) {
  return new Subscription({ id: "x", correlationCode: "x", status });
}

test("pending pode ir para active ou canceled", () => {
  assert.equal(canTransition("pending", "active"), true);
  assert.equal(canTransition("pending", "canceled"), true);
  assert.equal(canTransition("pending", "past_due"), false);
});

test("active pode ir para past_due ou canceled, nunca direto pra expired", () => {
  assert.equal(canTransition("active", "past_due"), true);
  assert.equal(canTransition("active", "canceled"), true);
  assert.equal(canTransition("active", "expired"), false);
});

test("past_due é a janela de dunning: pode voltar a active, expirar ou cancelar", () => {
  assert.equal(canTransition("past_due", "active"), true);
  assert.equal(canTransition("past_due", "expired"), true);
  assert.equal(canTransition("past_due", "canceled"), true);
});

// Bug real corrigido nesta sessão: expired era estado morto (TRANSITIONS.expired
// costumava ser []), impedindo reativação mesmo com um novo pagamento aprovado.
test("expired pode reativar (não é mais um estado morto)", () => {
  assert.equal(canTransition("expired", "active"), true);
});

test("canceled pode reativar (reassinatura)", () => {
  assert.equal(canTransition("canceled", "active"), true);
});

test("transitionTo lança erro em transição ilegal e não muda o estado", () => {
  const sub = makeSub("pending");
  assert.throws(() => sub.transitionTo("past_due"), /Transição inválida/);
  assert.equal(sub.status, "pending");
});

test("transitionTo para o mesmo estado é no-op silencioso (evento duplicado de webhook)", () => {
  const sub = makeSub("active");
  const before = sub.updatedAt;
  sub.transitionTo("active");
  assert.equal(sub.status, "active");
  assert.equal(sub.updatedAt, before);
});

test("hasAccess: active e past_due liberam acesso, os demais não", () => {
  for (const status of STATUSES) {
    const expected = status === "active" || status === "past_due";
    assert.equal(makeSub(status).hasAccess(), expected, `status=${status}`);
  }
});
