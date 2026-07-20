// AnthropicChatProvider (chat, analyzePalm, summarizeWeeklyInsight...) nunca
// tinha teste — nada cobria o SDK devolvendo um content[] sem bloco de texto
// nem JSON malformado. Substitui provider.client por um objeto fake DEPOIS de
// construído (this.client é uma propriedade pública comum, sem precisar
// mockar o módulo @anthropic-ai/sdk inteiro) — mais simples e não depende de
// nenhuma flag experimental do node:test. Achado real de auditoria (19/07/2026).
const test = require("node:test");
const assert = require("node:assert/strict");
const { AnthropicChatProvider } = require("../src/infrastructure/AnthropicChatProvider");

function makeProvider(createImpl) {
  const provider = new AnthropicChatProvider({ apiKey: "chave-fake-de-teste" });
  provider.client = { messages: { create: createImpl } };
  return provider;
}

test("chat: bloco de texto presente retorna o texto da resposta", async () => {
  const provider = makeProvider(async () => ({ content: [{ type: "text", text: "Olá, tudo bem?" }] }));
  const reply = await provider.chat({ personaId: "luna", message: "oi", history: [] });
  assert.equal(reply, "Olá, tudo bem?");
});

test("chat: content sem nenhum bloco 'text' devolve string vazia, nunca lança nem fabrica texto", async () => {
  const provider = makeProvider(async () => ({ content: [{ type: "tool_use", id: "x" }] }));
  const reply = await provider.chat({ personaId: "luna", message: "oi", history: [] });
  assert.equal(reply, "");
});

test("chat: persona desconhecida cai no prompt da luna (default), não lança", async () => {
  let systemUsado = null;
  const provider = makeProvider(async ({ system }) => {
    systemUsado = system;
    return { content: [{ type: "text", text: "ok" }] };
  });
  await provider.chat({ personaId: "persona-que-nao-existe", message: "oi", history: [] });
  assert.ok(systemUsado.includes("Luna"), "esperava cair no prompt da Luna por padrão");
});

test("analyzePalm: JSON válido no bloco de texto é parseado e devolvido", async () => {
  const provider = makeProvider(async () => ({
    content: [{ type: "text", text: JSON.stringify({ title: "Recomeços e coragem", body: "Sua linha da vida..." }) }],
  }));
  const reading = await provider.analyzePalm({ imageBase64: "base64==", mediaType: "image/jpeg" });
  assert.deepEqual(reading, { title: "Recomeços e coragem", body: "Sua linha da vida..." });
});

test("analyzePalm: resposta sem bloco de texto lança (nunca fabrica uma leitura) — comportamento atual, não silencioso", async () => {
  const provider = makeProvider(async () => ({ content: [] }));
  await assert.rejects(() => provider.analyzePalm({ imageBase64: "base64==", mediaType: "image/jpeg" }));
});

test("analyzePalm: JSON malformado no bloco de texto lança (nunca devolve leitura inventada)", async () => {
  const provider = makeProvider(async () => ({ content: [{ type: "text", text: "isso não é JSON{" }] }));
  await assert.rejects(() => provider.analyzePalm({ imageBase64: "base64==", mediaType: "image/jpeg" }), SyntaxError);
});

test("summarizeWeeklyInsight: junta leituras de tipos diferentes no prompt e devolve title/body", async () => {
  let promptEnviado = null;
  const provider = makeProvider(async ({ messages }) => {
    promptEnviado = messages[0].content[0].text;
    return { content: [{ type: "text", text: JSON.stringify({ title: "Uma semana de recomeços", body: "..." }) }] };
  });
  const readings = [
    { type: "tarot", typeLabel: "Tarô", title: "A Torre", body: "perda de controle" },
    { type: "dream", typeLabel: "Sonho", title: "Queda", body: "sensação de queda livre" },
  ];
  const insight = await provider.summarizeWeeklyInsight({ readings });
  assert.equal(insight.title, "Uma semana de recomeços");
  assert.ok(promptEnviado.includes("A Torre"));
  assert.ok(promptEnviado.includes("Queda"));
});
