// Valida o port pra Node/CommonJS de lib/dailyThought.js (app Cosmic Guide)
// contra as mesmas datas de referência REAIS já validadas no app (ver
// C:\Users\XuXa\Downloads\Cosmic Guide\test\dailyThought.test.js e
// test\signs.test.js) — garante que a cópia não divergiu da fonte original.
const test = require("node:test");
const assert = require("node:assert/strict");
const { getThoughtForDate, isMercuryRetrograde, rulerOfDay } = require("../src/infrastructure/dailyThoughtContent");

test("lua cheia conhecida (25/jan/2024) aparece de verdade no texto", () => {
  const thought = getThoughtForDate(new Date("2024-01-25T17:54:00Z"));
  assert.ok(thought.includes("Lua Cheia"), thought);
});

test("lua nova conhecida (11/jan/2024) aparece de verdade no texto", () => {
  const thought = getThoughtForDate(new Date("2024-01-11T11:57:00Z"));
  assert.ok(thought.includes("Lua Nova"), thought);
});

test("signo pessoal aparece no início quando informado", () => {
  const thought = getThoughtForDate(new Date("2024-01-25T17:54:00Z"), { name: "Touro", icon: "♉" });
  assert.ok(thought.startsWith("♉ Touro,"), thought);
});

test("rulerOfDay bate com a regência real do dia da semana", () => {
  assert.equal(rulerOfDay(new Date(2024, 0, 12)).planet, "Vênus", "12/jan/2024 é sexta");
  assert.equal(rulerOfDay(new Date(2024, 0, 13)).planet, "Saturno", "13/jan/2024 é sábado");
});

test("isMercuryRetrograde bate com os períodos reais de 2024 (15/abr true, 01/jun false)", () => {
  assert.equal(isMercuryRetrograde("2024-04-15"), true);
  assert.equal(isMercuryRetrograde("2024-06-01"), false);
});

test("é determinístico: mesma data sempre devolve o mesmo texto", () => {
  const a = getThoughtForDate(new Date("2024-03-10T12:00:00Z"));
  const b = getThoughtForDate(new Date("2024-03-10T12:00:00Z"));
  assert.equal(a, b);
});
