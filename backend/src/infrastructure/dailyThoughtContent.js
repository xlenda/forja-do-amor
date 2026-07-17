// Port pra Node/CommonJS do conteúdo do "pensamento cósmico do dia" do app
// Cosmic Guide (C:\Users\XuXa\Downloads\Cosmic Guide\lib\dailyThought.js,
// lib\signs.js e lib\lunarCalendar.js) — usado pelo script de envio diário de
// Web Push (scripts/send-daily-push.js), já que o app roda em React
// Native/Expo e este backend roda em Node puro; astronomy-engine funciona
// igual nos dois ambientes, então a matemática é idêntica.
//
// MANTER EM SINCRONIA: se o comportamento mudar no app (novo texto de fase,
// nova regência, etc.), replicar aqui também — são cópias intencionais, não
// um pacote compartilhado (não existe monorepo entre os dois projetos).
"use strict";

const SIGNS = [
  { name: "Áries", element: "fogo", emoji: "♈", range: "21/03–19/04" },
  { name: "Touro", element: "terra", emoji: "♉", range: "20/04–20/05" },
  { name: "Gêmeos", element: "ar", emoji: "♊", range: "21/05–20/06" },
  { name: "Câncer", element: "água", emoji: "♋", range: "21/06–22/07" },
  { name: "Leão", element: "fogo", emoji: "♌", range: "23/07–22/08" },
  { name: "Virgem", element: "terra", emoji: "♍", range: "23/08–22/09" },
  { name: "Libra", element: "ar", emoji: "♎", range: "23/09–22/10" },
  { name: "Escorpião", element: "água", emoji: "♏", range: "23/10–21/11" },
  { name: "Sagitário", element: "fogo", emoji: "♐", range: "22/11–21/12" },
  { name: "Capricórnio", element: "terra", emoji: "♑", range: "22/12–19/01" },
  { name: "Aquário", element: "ar", emoji: "♒", range: "20/01–18/02" },
  { name: "Peixes", element: "água", emoji: "♓", range: "19/02–20/03" },
];

let _Astronomy = null;
function getAstronomy() {
  if (_Astronomy) return _Astronomy;
  try {
    _Astronomy = require("astronomy-engine");
  } catch {
    _Astronomy = false;
  }
  return _Astronomy;
}

function parseStrictDate(dateStr) {
  if (!dateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return null;
  const year = +m[1], month = +m[2], day = +m[3];
  const d = new Date(dateStr + "T00:00");
  if (Number.isNaN(d.getTime())) return null;
  if (d.getFullYear() !== year || d.getMonth() + 1 !== month || d.getDate() !== day) return null;
  return d;
}

function moonSign(dateStr, timeStr) {
  if (!dateStr) return null;
  if (!parseStrictDate(dateStr)) return null;
  const A = getAstronomy();
  if (!A) return null;
  const iso = `${dateStr}T${timeStr || "12:00"}:00Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const eclip = A.EclipticGeoMoon(d);
  const lon = ((eclip.lon % 360) + 360) % 360;
  const idx = Math.floor(lon / 30);
  return SIGNS[idx];
}

const PLANETS = [
  { name: "Sol", body: null },
  { name: "Lua", body: null },
  { name: "Mercúrio", body: "Mercury" },
  { name: "Vênus", body: "Venus" },
  { name: "Marte", body: "Mars" },
  { name: "Júpiter", body: "Jupiter" },
  { name: "Saturno", body: "Saturn" },
  { name: "Urano", body: "Uranus" },
  { name: "Netuno", body: "Neptune" },
  { name: "Plutão", body: "Pluto" },
];

function planetPositions(dateStr, timeStr) {
  if (!dateStr) return null;
  if (!parseStrictDate(dateStr)) return null;
  const A = getAstronomy();
  if (!A) return null;
  const iso = `${dateStr}T${timeStr || "12:00"}:00Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  return PLANETS.map(({ name, body }) => {
    let elon;
    if (name === "Sol") {
      elon = A.SunPosition(d).elon;
    } else if (name === "Lua") {
      elon = A.EclipticGeoMoon(d).lon;
    } else {
      elon = A.Ecliptic(A.GeoVector(A.Body[body], d, true)).elon;
    }
    return { planet: name, longitude: ((elon % 360) + 360) % 360 };
  });
}

function _angularSeparation(lonA, lonB) {
  const diff = Math.abs(lonA - lonB);
  return diff > 180 ? 360 - diff : diff;
}

const ASPECTS_TABLE = [
  { type: "Conjunção", angle: 0, orb: 8 },
  { type: "Sextil", angle: 60, orb: 6 },
  { type: "Quadratura", angle: 90, orb: 8 },
  { type: "Trígono", angle: 120, orb: 8 },
  { type: "Oposição", angle: 180, orb: 8 },
];

function aspects(dateStr, timeStr) {
  const positions = planetPositions(dateStr, timeStr);
  if (!positions) return null;

  const out = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i];
      const b = positions[j];
      const sep = _angularSeparation(a.longitude, b.longitude);
      for (const { type, angle, orb } of ASPECTS_TABLE) {
        const delta = Math.abs(sep - angle);
        if (delta <= orb) {
          out.push({ planetA: a.planet, planetB: b.planet, aspectType: type, exactAngle: sep, orb: delta });
          break;
        }
      }
    }
  }
  return out;
}

function isMercuryRetrograde(dateStr) {
  if (!dateStr) return null;
  if (!parseStrictDate(dateStr)) return null;
  const A = getAstronomy();
  if (!A) return null;

  const center = new Date(`${dateStr}T12:00:00Z`);
  const before = new Date(center.getTime() - 2 * 24 * 60 * 60 * 1000);
  const after = new Date(center.getTime() + 2 * 24 * 60 * 60 * 1000);

  const lonBefore = A.Ecliptic(A.GeoVector(A.Body.Mercury, before, true)).elon;
  const lonAfter = A.Ecliptic(A.GeoVector(A.Body.Mercury, after, true)).elon;

  let diff = lonAfter - lonBefore;
  diff = ((diff + 540) % 360) - 180;

  return diff < 0;
}

const PHASES = [
  {
    name: "Lua Nova",
    emoji: "🌑",
    reflexao:
      "A tradição lunar milenar aponta este como o momento de plantar uma intenção nova ou começar algo do zero — um convite simbólico à pausa antes de agir. Vale anotar o que você quer deixar nascer neste ciclo.",
  },
  {
    name: "Lua Crescente",
    emoji: "🌒",
    reflexao:
      "A tradição lunar aponta construção aqui: dar os primeiros passos no que começou na Lua Nova. É um lembrete simbólico de manter o ritmo — pequenas ações contam mais que grandes decisões agora.",
  },
  {
    name: "Quarto Crescente",
    emoji: "🌓",
    reflexao:
      "Fase de ajuste de rota na tradição lunar — a tensão criativa que empurra pra frente. Um convite simbólico a revisar o plano; vale perguntar o que precisa de mais foco esta semana.",
  },
  {
    name: "Lua Gibosa Crescente",
    emoji: "🌔",
    reflexao:
      "Momento de refinar detalhes antes da fase cheia, na leitura tradicional dos ciclos lunares — um convite simbólico à paciência com o que já está em andamento. Ajustar é diferente de recomeçar.",
  },
  {
    name: "Lua Cheia",
    emoji: "🌕",
    reflexao:
      "É o pico do ciclo na tradição lunar — momento de colher, celebrar ou enxergar com mais clareza o que já vinha se desenhando. Um convite simbólico à observação; boa fase pra reconhecer o que amadureceu.",
  },
  {
    name: "Lua Gibosa Minguante",
    emoji: "🌖",
    reflexao:
      "Fase de gratidão e compartilhamento do que foi colhido, na tradição lunar — um convite simbólico a olhar pra trás com mais leveza. Bom momento pra repassar algo que você aprendeu.",
  },
  {
    name: "Quarto Minguante",
    emoji: "🌗",
    reflexao:
      "É hora de soltar o que não serve mais, na leitura tradicional deste quarto lunar — um convite simbólico à faxina emocional. Pergunte a si mesma(o) o que já pode ficar pra trás.",
  },
  {
    name: "Lua Minguante",
    emoji: "🌘",
    reflexao:
      "Fase de descanso e recolhimento antes do próximo ciclo começar, na tradição lunar — um convite simbólico a desacelerar. Bom momento pra silêncio e balanço pessoal.",
  },
];

function phaseIndexFromLongitude(lonDeg) {
  const lon = ((lonDeg % 360) + 360) % 360;
  return Math.round(lon / 45) % 8;
}

function getMoonPhase(date) {
  const A = getAstronomy();
  if (!A) return null;

  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;

  const lonDeg = A.MoonPhase(d);
  if (typeof lonDeg !== "number" || Number.isNaN(lonDeg)) return null;

  const idx = phaseIndexFromLongitude(lonDeg);
  const phase = PHASES[idx];

  return { date: d, longitude: lonDeg, name: phase.name, emoji: phase.emoji, reflexao: phase.reflexao };
}

const RULER_BY_WEEKDAY = [
  { planet: "Sol", emoji: "☀️", theme: "vitalidade e propósito pessoal" }, // domingo
  { planet: "Lua", emoji: "🌙", theme: "emoções, família e intuição" }, // segunda
  { planet: "Marte", emoji: "🔥", theme: "ação, coragem e decisões diretas" }, // terça
  { planet: "Mercúrio", emoji: "💬", theme: "comunicação, trabalho e negócios" }, // quarta
  { planet: "Júpiter", emoji: "🍀", theme: "expansão, sorte e oportunidades" }, // quinta
  { planet: "Vênus", emoji: "💛", theme: "amor, beleza e dinheiro" }, // sexta
  { planet: "Saturno", emoji: "🪐", theme: "disciplina e responsabilidade" }, // sábado
];

function rulerOfDay(date) {
  return RULER_BY_WEEKDAY[date.getDay()];
}

function strongestAspect(dateStr) {
  const all = aspects(dateStr);
  if (!all || all.length === 0) return null;
  return all.reduce((best, a) => (a.orb < best.orb ? a : best), all[0]);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateStr(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

// personalSign: { name, icon } opcional (nunca inventado aqui — vem de fora,
// já salvo pela pessoa quando se inscreveu no Web Push).
function getThoughtForDate(date, personalSign) {
  const phase = getMoonPhase(date);
  if (!phase) {
    return "O céu de hoje ainda está carregando — abra o Calendário Lunar em instantes.";
  }

  const dateStr = toDateStr(date);
  const moon = moonSign(dateStr);
  const signPart = moon && moon.name ? `A Lua está em ${moon.name} ${moon.emoji || ""}. ` : "";
  const greeting =
    personalSign && personalSign.name ? `${personalSign.icon ? personalSign.icon + " " : ""}${personalSign.name}, ` : "";

  const ruler = rulerOfDay(date);
  const rulerPart = ` Hoje é dia de ${ruler.planet} ${ruler.emoji} — favorece ${ruler.theme}.`;

  const retro = isMercuryRetrograde(dateStr);
  const retroPart = retro
    ? " Mercúrio está retrógrado ↩️ — vale cuidado redobrado com comunicação, contratos e viagens."
    : "";

  const aspect = strongestAspect(dateStr);
  const aspectPart = aspect
    ? ` O aspecto mais forte de hoje é ${aspect.planetA} em ${aspect.aspectType.toLowerCase()} com ${aspect.planetB}.`
    : "";

  return `${greeting}${phase.emoji} ${phase.name}. ${signPart}${phase.reflexao}${rulerPart}${retroPart}${aspectPart}`;
}

function getTodaysThought(personalSign) {
  return getThoughtForDate(new Date(), personalSign);
}

module.exports = {
  getMoonPhase,
  moonSign,
  aspects,
  planetPositions,
  isMercuryRetrograde,
  rulerOfDay,
  getThoughtForDate,
  getTodaysThought,
};
