// Versión en ESPAÑOL de los datos de astrología, usada solo por el funnel (páginas en app/(funil)/).
// El resto de la app (hub, horóscopo, etc.) sigue usando lib/signs.js en portugués — no se toca aquí.

export const SIGNS = [
  { name: "Aries", element: "fuego", emoji: "♈", range: "21/03–19/04" },
  { name: "Tauro", element: "tierra", emoji: "♉", range: "20/04–20/05" },
  { name: "Géminis", element: "aire", emoji: "♊", range: "21/05–20/06" },
  { name: "Cáncer", element: "agua", emoji: "♋", range: "21/06–22/07" },
  { name: "Leo", element: "fuego", emoji: "♌", range: "23/07–22/08" },
  { name: "Virgo", element: "tierra", emoji: "♍", range: "23/08–22/09" },
  { name: "Libra", element: "aire", emoji: "♎", range: "23/09–22/10" },
  { name: "Escorpio", element: "agua", emoji: "♏", range: "23/10–21/11" },
  { name: "Sagitario", element: "fuego", emoji: "♐", range: "22/11–21/12" },
  { name: "Capricornio", element: "tierra", emoji: "♑", range: "22/12–19/01" },
  { name: "Acuario", element: "aire", emoji: "♒", range: "20/01–18/02" },
  { name: "Piscis", element: "agua", emoji: "♓", range: "19/02–20/03" },
];

export function signByName(name) {
  return SIGNS.find((s) => s.name === name) || null;
}

// Detecta el signo solar a partir de la fecha de nacimiento (YYYY-MM-DD), para prellenar sin pedirlo por separado.
export function signoFromDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00");
  if (Number.isNaN(d.getTime())) return null;
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return "Capricornio";
  if (m === 1 || (m === 2 && day <= 18)) return "Acuario";
  if (m === 2 || (m === 3 && day <= 20)) return "Piscis";
  if (m === 3 || (m === 4 && day <= 19)) return "Aries";
  if (m === 4 || (m === 5 && day <= 20)) return "Tauro";
  if (m === 5 || (m === 6 && day <= 20)) return "Géminis";
  if (m === 6 || (m === 7 && day <= 22)) return "Cáncer";
  if (m === 7 || (m === 8 && day <= 22)) return "Leo";
  if (m === 8 || (m === 9 && day <= 22)) return "Virgo";
  if (m === 9 || (m === 10 && day <= 22)) return "Libra";
  if (m === 10 || (m === 11 && day <= 21)) return "Escorpio";
  return "Sagitario"; // m === 11 (día ≥22) o m === 12 (día ≤21)
}

const PAIRS = {
  "fuego+fuego": {
    texto: "Dos signos de fuego: intensidad al doble. Viven todo con pasión y movimiento.",
    forte: "Energía y entusiasmo que contagia.",
    cuidado: "Recuerden enfriar la cabeza antes de discutir en el calor del momento.",
  },
  "fuego+tierra": {
    texto: "Fuego y tierra: la pasión encuentra estabilidad. Uno enciende, el otro sostiene.",
    forte: "Se equilibran — sueño con los pies en la tierra.",
    cuidado: "Respeten los ritmos: uno corre, el otro construye despacio.",
  },
  "aire+fuego": {
    texto: "Fuego y aire: el aire alimenta la llama. Juntos convierten ideas en acción muy rápido.",
    forte: "Complicidad, aventura y mucha conversación.",
    cuidado: "Cuidado con empezar mil cosas y terminar pocas.",
  },
  "agua+fuego": {
    texto: "Fuego y agua: la intensidad encuentra profundidad. Atracción fuerte que pide cintura.",
    forte: "Cuando se sintonizan, es profundo y apasionado.",
    cuidado: "Hablen de lo que sienten — evita rencores guardados.",
  },
  "tierra+tierra": {
    texto: "Dos signos de tierra: solidez pura. Construyen una base que dura.",
    forte: "Confianza, lealtad y proyectos a largo plazo.",
    cuidado: "Reserven espacio para la espontaneidad y la sorpresa.",
  },
  "aire+tierra": {
    texto: "Tierra y aire: la practicidad encuentra las ideas. Uno traza el plan, el otro lo hace realidad.",
    forte: "Complementarios — pensamiento + ejecución.",
    cuidado: "Alineen expectativas: lógica y emoción hablan idiomas distintos.",
  },
  "agua+tierra": {
    texto: "Tierra y agua: el agua nutre la tierra. Cuidado y crecimiento van de la mano.",
    forte: "Calidez, seguridad y un afecto que florece.",
    cuidado: "No dejen que la comodidad se vuelva estancamiento.",
  },
  "aire+aire": {
    texto: "Dos signos de aire: ligereza y conexión mental. Nunca se quedan sin tema de conversación.",
    forte: "Amistad, humor y libertad.",
    cuidado: "Traigan más presencia y contacto al día a día.",
  },
  "agua+aire": {
    texto: "Aire y agua: la sensibilidad encuentra la comunicación. Sentir y hablar de lo que se siente.",
    forte: "Logran nombrar lo que sienten — algo raro y hermoso.",
    cuidado: "Equilibren razón y emoción en las decisiones.",
  },
  "agua+agua": {
    texto: "Dos signos de agua: profundidad emocional. Una conexión que siente todo hondo.",
    forte: "Empatía e intimidad fuera de lo común.",
    cuidado: "Cuiden no ahogarse en las emociones del otro — respiren.",
  },
};

export function compatibility(nameA, nameB) {
  const a = signByName(nameA);
  const b = signByName(nameB);
  if (!a || !b) return null;
  const key = [a.element, b.element].sort().join("+");
  const data = PAIRS[key];
  return {
    titulo: `${a.emoji} ${a.name} + ${b.name} ${b.emoji}`,
    elementoA: a.element,
    elementoB: b.element,
    emojiA: a.emoji,
    emojiB: b.emoji,
    ...data,
  };
}

const PCT = {
  "aire+aire": 87, "aire+fuego": 92, "aire+tierra": 76, "agua+aire": 80,
  "fuego+fuego": 90, "fuego+tierra": 78, "agua+fuego": 74,
  "tierra+tierra": 88, "agua+tierra": 91, "agua+agua": 89,
};
export function compatPercent(nameA, nameB) {
  const a = signByName(nameA);
  const b = signByName(nameB);
  if (!a || !b) return null;
  const key = [a.element, b.element].sort().join("+");
  return PCT[key] || 82;
}

// Números "cósmicos" de la pareja — solo por diversión, determinístico según nombres/signos.
export function cosmicNumbers(seed, count = 3) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out = [];
  while (out.length < count) {
    h = (h * 1103515245 + 12345) >>> 0;
    const num = (h % 99) + 1;
    if (!out.includes(num)) out.push(num);
  }
  return out;
}

const FREQUENCIAS = [
  "528Hz · frecuencia del amor",
  "639Hz · conexión y relaciones",
  "432Hz · armonía",
  "741Hz · expresión",
];
export function frequenciaFor(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return FREQUENCIAS[h % FREQUENCIAS.length];
}

// Cartas de la pareja — mecánica "elijan 3 cartas", con significados POSITIVOS (entretenimiento).
export const CARDS = [
  { name: "El Corazón", emoji: "❤️", meaning: "amor y conexión sincera" },
  { name: "La Estrella", emoji: "✨", meaning: "esperanza y sueños compartidos" },
  { name: "El Viaje", emoji: "🧭", meaning: "aventuras esperándolos" },
  { name: "El Sol", emoji: "☀️", meaning: "alegría y días luminosos juntos" },
  { name: "La Luna", emoji: "🌙", meaning: "intuición e intimidad" },
  { name: "El Lazo", emoji: "🎀", meaning: "compromiso y complicidad" },
  { name: "La Llave", emoji: "🗝️", meaning: "un nuevo capítulo abriéndose" },
  { name: "El Brindis", emoji: "🥂", meaning: "celebración y momentos en pareja" },
  { name: "El Hogar", emoji: "🏡", meaning: "construir un hogar juntos" },
];

// Luna — cálculo REAL de posición astronómica (astronomy-engine).
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

export function moonSign(dateStr, timeStr) {
  if (!dateStr) return null;
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
