// Teste HTTP de ponta a ponta do feed social contra o Express e o SQLite
// reais (DATA_DIR isolado em diretório temporário) — antes nenhum teste
// exercitava socialRoutes.js de verdade, então os bugs de segurança já
// corrigidos nesta sessão (escape do LIKE, canViewPosts, clamp de
// limit/before negativo) não tinham nenhuma rede de regressão. Achado real
// de auditoria (19/07/2026).
//
// requireAuth (src/http/socialAuth.js) verifica o JWT contra o JWKS real do
// Supabase — pra testar as ROTAS sem depender de rede/chave privada real,
// mockamos jose.jwtVerify pra aceitar qualquer token "user:<id>" e extrair o
// sub dali. Precisa de --experimental-test-module-mocks (ver package.json) e
// tem que rodar ANTES de qualquer require que puxe socialAuth.js.
const { mock } = require("node:test");

mock.module("jose", {
  namedExports: {
    createRemoteJWKSet: () => () => {},
    jwtVerify: async (token) => {
      if (typeof token !== "string" || !token.startsWith("user:")) {
        throw new Error("token de teste inválido");
      }
      const userId = token.slice("user:".length);
      return { payload: { sub: userId, email: `${userId}@example.com` } };
    },
  },
});

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "forja-test-social-"));
process.env.DATA_DIR = TEST_DATA_DIR;
process.env.HOTMART_HOTTOK = "test-hottok-secret";
process.env.HOTMART_OFFER_CODE = "test-offer-code";
process.env.ALLOWED_ORIGIN = "http://localhost";
// Configurado (mesmo sem nenhum teste admin aqui) só pra que o teste abaixo
// prove que um JWT social não serve de X-Admin-Token — sem isso, a rota
// admin responderia 503 (não configurada) antes mesmo de checar o token,
// o que testaria a coisa errada.
process.env.ADMIN_TOKEN = "admin-token-nao-usado-pelos-testes-sociais";

const test = require("node:test");
const assert = require("node:assert/strict");
const supertest = require("supertest");
const { app } = require("../src/http/server");

function authHeader(userId) {
  return { Authorization: `Bearer user:${userId}` };
}

function createProfile(userId, username, displayName) {
  return supertest(app).put("/api/social/profile").set(authHeader(userId)).send({ displayName, username });
}

test.after(() => {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

test("sem token, rotas sociais devolvem 401", async () => {
  const res = await supertest(app).get("/api/social/profile/me");
  assert.equal(res.status, 401);
});

test("cria perfil e acha pelo prefixo do username", async () => {
  await createProfile("u1", "analuz", "Ana Luz");
  const res = await supertest(app).get("/api/social/search?username=ana").set(authHeader("u2"));
  assert.equal(res.status, 200);
  assert.ok(res.body.profiles.some((p) => p.username === "analuz"));
});

test("username com metacaractere de LIKE (%) não devolve o diretório inteiro", async () => {
  await createProfile("u3", "carlos1", "Carlos");
  const res = await supertest(app)
    .get("/api/social/search?username=" + encodeURIComponent("%"))
    .set(authHeader("u4"));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.profiles, []);
});

test("posts de quem não sigo ficam vazios em GET /users/:userId (canViewPosts)", async () => {
  await createProfile("autor1", "autor1", "Autor Um");
  await supertest(app).post("/api/social/posts").set(authHeader("autor1")).send({ title: "Minha leitura", body: "corpo real" });

  await createProfile("visitante1", "visitante1", "Visitante");
  const res = await supertest(app).get("/api/social/users/autor1").set(authHeader("visitante1"));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.posts, []);
});

test("depois de seguir, os posts do autor aparecem em GET /users/:userId", async () => {
  await createProfile("autor2", "autor2", "Autor Dois");
  await supertest(app).post("/api/social/posts").set(authHeader("autor2")).send({ title: "Leitura visível", body: "corpo real" });

  await createProfile("seguidor2", "seguidor2", "Seguidor");
  await supertest(app).post("/api/social/follow/autor2").set(authHeader("seguidor2"));

  const res = await supertest(app).get("/api/social/users/autor2").set(authHeader("seguidor2"));
  assert.equal(res.status, 200);
  assert.equal(res.body.posts.length, 1);
  assert.equal(res.body.posts[0].title, "Leitura visível");
  assert.equal(res.body.followers, 1);
});

test("GET /feed pagina de verdade com has_next/next_cursor", async () => {
  await createProfile("prolifico", "prolifico", "Prolífico");
  for (let i = 0; i < 3; i++) {
    await supertest(app).post("/api/social/posts").set(authHeader("prolifico")).send({ title: `Post ${i}`, body: "corpo" });
  }
  await createProfile("leitor", "leitor", "Leitor");
  await supertest(app).post("/api/social/follow/prolifico").set(authHeader("leitor"));

  const page1 = await supertest(app).get("/api/social/feed?limit=2").set(authHeader("leitor"));
  assert.equal(page1.body.posts.length, 2);
  assert.equal(page1.body.meta.has_next, true);
  assert.ok(page1.body.meta.next_cursor);

  const page2 = await supertest(app)
    .get(`/api/social/feed?limit=2&before=${page1.body.meta.next_cursor}`)
    .set(authHeader("leitor"));
  assert.equal(page2.body.posts.length, 1);
  assert.equal(page2.body.meta.has_next, false);
});

test("dono consegue apagar o próprio post; outra pessoa recebe 403", async () => {
  await createProfile("dono1", "dono1", "Dono");
  const postRes = await supertest(app)
    .post("/api/social/posts")
    .set(authHeader("dono1"))
    .send({ title: "Apagar depois", body: "corpo real" });
  const postId = postRes.body.id;

  await createProfile("outro1", "outro1", "Outro");
  const forbidden = await supertest(app).delete(`/api/social/posts/${postId}`).set(authHeader("outro1"));
  assert.equal(forbidden.status, 403);

  const ok = await supertest(app).delete(`/api/social/posts/${postId}`).set(authHeader("dono1"));
  assert.equal(ok.status, 204);
});

test("JWT social válido não serve pra autenticar rotas admin (limites diferentes)", async () => {
  const res = await supertest(app).get("/api/admin/subscriptions/qualquer").set(authHeader("dono1"));
  assert.equal(res.status, 401);
});
