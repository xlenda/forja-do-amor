// Camada central de retenção: sequência diária, conquistas e resumo do mês.
// Lê os dados que cada área já salva no localStorage (nenhuma área precisa saber disso).

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isoAddDays(iso, delta) {
  const d = new Date(iso + "T00:00");
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// ---------- Sequência (streak) ----------
export function streakKey(voce, amor) {
  return `gff-streak:${voce}:${amor}`;
}

// Chame 1x por visita ao hub — soma 1 se for dia novo consecutivo, mantém se já contou hoje, reinicia sem culpa se quebrou.
export function bumpStreak(voce, amor) {
  const key = streakKey(voce, amor);
  const today = todayISO();
  const yesterday = isoAddDays(today, -1);
  const state = readJSON(key, { lastDate: null, count: 0, longest: 0 });

  let { lastDate, count, longest } = state;
  let broke = false;
  let prevCount = 0;
  if (lastDate === today) {
    // já contabilizado hoje
  } else if (lastDate === yesterday) {
    count += 1;
  } else {
    broke = Boolean(lastDate) && count > 1;
    prevCount = count;
    count = 1;
  }
  lastDate = today;
  longest = Math.max(longest, count);

  const next = { lastDate, count, longest, broke, prevCount };
  try { localStorage.setItem(key, JSON.stringify({ lastDate, count, longest })); } catch {}
  return next;
}

export function readStreak(voce, amor) {
  return readJSON(streakKey(voce, amor), { lastDate: null, count: 0, longest: 0 });
}

// ---------- Reparo de racha (1 vez por mes, solo si había una racha real) ----------
function repairKey(voce, amor) {
  return `gff-streak-repair:${voce}:${amor}`;
}

export function repairInfo(voce, amor) {
  const ym = todayISO().slice(0, 7);
  const r = readJSON(repairKey(voce, amor), { ym: "", used: 0 });
  const usedThisMonth = r.ym === ym ? r.used : 0;
  return { canRepair: usedThisMonth < 1, usedThisMonth, limit: 1 };
}

// Restaura la racha que se acaba de romper (usa el prevCount que bumpStreak devolvió) en vez de reiniciar en 1.
export function repairStreak(voce, amor, prevCount) {
  const { canRepair } = repairInfo(voce, amor);
  if (!canRepair) return null;
  const key = streakKey(voce, amor);
  const ym = todayISO().slice(0, 7);
  const state = readJSON(key, { lastDate: todayISO(), count: 1, longest: 1 });
  const restoredCount = Math.max(prevCount + 1, state.count);
  const restored = { lastDate: state.lastDate, count: restoredCount, longest: Math.max(state.longest, restoredCount) };
  try {
    localStorage.setItem(key, JSON.stringify(restored));
    localStorage.setItem(repairKey(voce, amor), JSON.stringify({ ym, used: 1 }));
  } catch {}
  return restored;
}

// ---------- Historial de clima (lee las claves diarias que "Hoy" ya guarda) ----------
export function climaHistory(voce, amor, days = 14) {
  const out = [];
  const today = todayISO();
  for (let i = 0; i < days; i++) {
    const iso = isoAddDays(today, -i);
    const d = readJSON(`gff-hoje:${voce}:${amor}:${iso}`, {});
    if (d.clima) out.push({ date: iso, clima: d.clima });
  }
  return out; // más reciente primero
}

// Días consecutivos marcados "distante", contando desde el más reciente con dato.
export function distanciamentoStreak(voce, amor) {
  const hist = climaHistory(voce, amor, 14);
  let n = 0;
  for (const h of hist) {
    if (h.clima === "distante") n++;
    else break;
  }
  return n;
}

// ---------- "Hace 1 año" — memorias reales guardadas cerca de esta fecha, en años anteriores ----------
export function onThisDay(voce, amor, windowDays = 2) {
  const t = readJSON(`gff:${voce}:${amor}`, { memories: [] });
  const now = new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hits = [];
  for (const m of t.memories || []) {
    if (!m.date) continue;
    const d = new Date(m.date + "T00:00");
    if (isNaN(d.getTime())) continue;
    const yearsAgo = now.getFullYear() - d.getFullYear();
    if (yearsAgo < 1) continue;
    const sameYearDate = new Date(now.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((sameYearDate - todayMid) / 86400000);
    if (Math.abs(diffDays) <= windowDays) hits.push({ ...m, yearsAgo });
  }
  return hits.sort((a, b) => b.yearsAgo - a.yearsAgo);
}

// ---------- Resumen semanal honesto (solo cuenta lo que ya tiene fecha real) ----------
export function weeklyDigest(voce, amor) {
  const today = todayISO();
  let hojeAnsweredDays = 0;
  for (let i = 0; i < 7; i++) {
    const iso = isoAddDays(today, -i);
    const d = readJSON(`gff-hoje:${voce}:${amor}:${iso}`, {});
    if (d.savedVoce && d.savedAmor) hojeAnsweredDays++;
  }
  const t = readJSON(`gff:${voce}:${amor}`, { memories: [] });
  const weekAgo = isoAddDays(today, -6);
  const memoriesThisWeek = (t.memories || []).filter((m) => m.date && m.date >= weekAgo && m.date <= today).length;
  return { hojeAnsweredDays, memoriesThisWeek };
}

// ---------- Fechas importantes del casal (además del aniversario de inicio) ----------
export function datesKey(voce, amor) {
  return `gff-datas:${voce}:${amor}`;
}
export function readImportantDates(voce, amor) {
  return readJSON(datesKey(voce, amor), []);
}
export function saveImportantDates(voce, amor, list) {
  try { localStorage.setItem(datesKey(voce, amor), JSON.stringify(list)); } catch {}
}
// mmdd: "MM-DD" → días que faltan para la próxima vez que ocurra esa fecha
export function nextOccurrence(mmdd) {
  const [mm, dd] = mmdd.split("-").map(Number);
  if (!mm || !dd) return null;
  const now = new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), mm - 1, dd);
  if (next < todayMid) next = new Date(now.getFullYear() + 1, mm - 1, dd);
  return Math.round((next - todayMid) / 86400000);
}

// ---------- Coleta de dados de todas as áreas ----------
export function collectData(voce, amor) {
  const timeline = readJSON(`gff:${voce}:${amor}`, { memories: [], capsules: [] });
  const hoje = readJSON(`gff-hoje:${voce}:${amor}:${todayISO()}`, {});
  const reconectar = readJSON(`gff-reconectar:${voce}:${amor}`, {});
  const descobrir = readJSON(`gff-descobrir:${voce}:${amor}`, { linguagem: null, apego: null });
  const agir = readJSON(`gff-agir:${voce}:${amor}`, { favorites: [], done: [], goalSaved: "", goalDone: false });
  const streak = readStreak(voce, amor);

  const capsulesOpened = (timeline.capsules || []).filter((c) => new Date(c.unlockAt + "T00:00") <= new Date()).length;
  const reconectarChecks = Object.values(reconectar || {}).filter(Boolean).length;

  return {
    memoriesCount: (timeline.memories || []).length,
    capsulesCount: (timeline.capsules || []).length,
    capsulesOpened,
    hojeRespondeuAmbos: Boolean(hoje.savedVoce && hoje.savedAmor),
    clima: hoje.clima || null,
    reconectarChecks,
    linguagemFeito: Boolean(descobrir.linguagem),
    apegoFeito: Boolean(descobrir.apego),
    agirDoneCount: (agir.done || []).length,
    favoritesCount: (agir.favorites || []).length,
    goalDone: Boolean(agir.goalDone),
    goalSaved: agir.goalSaved || "",
    streakCount: streak.count,
    streakLongest: streak.longest,
  };
}

// ---------- Conquistas (badges) ----------
export const BADGES = [
  { id: "memoria1", emoji: "🌱", title: "Primer recuerdo", desc: "Agregaron el primer recuerdo a la línea de tiempo.", check: (d) => d.memoriesCount >= 1 },
  { id: "capsula1", emoji: "⏳", title: "Primera cápsula sellada", desc: "Crearon la primera cápsula del tiempo.", check: (d) => d.capsulesCount >= 1 },
  { id: "capsulaAberta", emoji: "🔓", title: "Una sorpresa revelada", desc: "Una cápsula del tiempo de ustedes se abrió.", check: (d) => d.capsulesOpened >= 1 },
  { id: "streak7", emoji: "🔥", title: "7 días seguidos", desc: "Una semana entera cuidando la relación, día tras día.", check: (d) => d.streakLongest >= 7 },
  { id: "streak30", emoji: "🌟", title: "30 días seguidos", desc: "Un mes entero de constancia. Eso es raro.", check: (d) => d.streakLongest >= 30 },
  { id: "reconectar10", emoji: "💞", title: "10 misiones de reconexión", desc: "Completaron 10 pasos en los caminos de reconexión.", check: (d) => d.reconectarChecks >= 10 },
  { id: "autoconhecimento", emoji: "🔮", title: "Autoconocimiento en pareja", desc: "Descubrieron el lenguaje del amor y el estilo de apego de ustedes.", check: (d) => d.linguagemFeito && d.apegoFeito },
  { id: "desafio7", emoji: "🎯", title: "Desafío de 7 días", desc: "Completaron el desafío de gestos diarios.", check: (d) => d.agirDoneCount >= 7 },
  { id: "metaAlcancada", emoji: "⭐", title: "Meta alcanzada", desc: "Marcaron una meta de la pareja como cumplida.", check: (d) => d.goalDone },
  { id: "colecionador", emoji: "📸", title: "Coleccionistas de recuerdos", desc: "10 recuerdos guardados en la línea de tiempo.", check: (d) => d.memoriesCount >= 10 },
];

export function computeBadges(voce, amor) {
  const data = collectData(voce, amor);
  return BADGES.map((b) => ({ ...b, unlocked: b.check(data) }));
}

// ---------- Aniversário do casal ----------
export function getCoupleStartDate(voce, amor) {
  const t = readJSON(`gff:${voce}:${amor}`, {});
  return t.startDate || null;
}

// Dias até o próximo aniversário (mês/dia da data de início) + quantos anos completa.
export function nextAnniversary(startDateISO) {
  if (!startDateISO) return null;
  const start = new Date(startDateISO + "T00:00");
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), start.getMonth(), start.getDate());
  if (next < todayMidnight) next = new Date(now.getFullYear() + 1, start.getMonth(), start.getDate());
  const days = Math.round((next - todayMidnight) / 86400000);
  const anos = next.getFullYear() - start.getFullYear();
  return { days, anos };
}

// ---------- Resumo do mês ----------
export function monthlyRecap(voce, amor) {
  const timeline = readJSON(`gff:${voce}:${amor}`, { memories: [], capsules: [] });
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const memoriesThisMonth = (timeline.memories || []).filter((m) => (m.date || "").startsWith(ym)).length;
  const capsulesSealedThisMonth = (timeline.capsules || []).filter((c) => (c.unlockAt || "").startsWith(ym)).length;
  const data = collectData(voce, amor);
  return {
    mesLabel: now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    memoriesThisMonth,
    capsulesSealedThisMonth,
    reconectarChecks: data.reconectarChecks,
    agirDoneCount: data.agirDoneCount,
    streakCount: data.streakCount,
  };
}
