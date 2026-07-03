// Astrologia do Casal — conteúdo de ENTRETENIMENTO (honesto).
// Sem promessa sobrenatural, sem urgência falsa. É pra diversão e reflexão do casal.

export const SIGNS = [
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

export function signByName(name) {
  return SIGNS.find((s) => s.name === name) || null;
}

const PAIRS = {
  "fogo+fogo": {
    texto: "Dois signos de fogo: intensidade em dobro. Vocês vivem tudo com paixão e movimento.",
    forte: "Energia e entusiasmo que contagia.",
    cuidado: "Lembrem de esfriar a cabeça antes de discutir no calor do momento.",
  },
  "fogo+terra": {
    texto: "Fogo e terra: paixão encontra estabilidade. Um acende, o outro sustenta.",
    forte: "Vocês se equilibram — sonho com pé no chão.",
    cuidado: "Respeitem os ritmos: um corre, o outro constrói devagar.",
  },
  "ar+fogo": {
    texto: "Fogo e ar: o ar alimenta a chama. Juntos, viram ideia em ação rapidinho.",
    forte: "Cumplicidade, aventura e muita conversa.",
    cuidado: "Cuidado pra não começar mil coisas e terminar poucas.",
  },
  "fogo+água": {
    texto: "Fogo e água: intensidade encontra profundidade. Atração forte que pede jogo de cintura.",
    forte: "Quando se sintonizam, é profundo e apaixonado.",
    cuidado: "Falem sobre o que sentem — evita mágoa guardada.",
  },
  "terra+terra": {
    texto: "Dois signos de terra: solidez pura. Vocês constroem uma base que dura.",
    forte: "Confiança, lealdade e projetos de longo prazo.",
    cuidado: "Reservem espaço pra espontaneidade e surpresa.",
  },
  "ar+terra": {
    texto: "Terra e ar: praticidade encontra ideias. Um traça o plano, o outro faz acontecer.",
    forte: "Complementares — pensamento + execução.",
    cuidado: "Alinhem expectativas: lógica e emoção falam línguas diferentes.",
  },
  "terra+água": {
    texto: "Terra e água: a água nutre a terra. Cuidado e crescimento andam juntos aqui.",
    forte: "Aconchego, segurança e afeto que floresce.",
    cuidado: "Não deixem o conforto virar acomodação.",
  },
  "ar+ar": {
    texto: "Dois signos de ar: leveza e conexão mental. Vocês nunca ficam sem assunto.",
    forte: "Amizade, humor e liberdade.",
    cuidado: "Tragam mais presença e toque pro dia a dia.",
  },
  "ar+água": {
    texto: "Ar e água: sensibilidade encontra comunicação. Sentir e falar sobre o sentir.",
    forte: "Vocês conseguem nomear o que sentem — raro e bonito.",
    cuidado: "Equilibrem razão e emoção nas decisões.",
  },
  "água+água": {
    texto: "Dois signos de água: profundidade emocional. Uma conexão que sente tudo fundo.",
    forte: "Empatia e intimidade fora do comum.",
    cuidado: "Cuidem pra não se afogar nas emoções um do outro — respirem.",
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
  "ar+ar": 87, "ar+fogo": 92, "ar+terra": 76, "ar+água": 80,
  "fogo+fogo": 90, "fogo+terra": 78, "fogo+água": 74,
  "terra+terra": 88, "terra+água": 91, "água+água": 89,
};
export function compatPercent(nameA, nameB) {
  const a = signByName(nameA);
  const b = signByName(nameB);
  if (!a || !b) return null;
  const key = [a.element, b.element].sort().join("+");
  return PCT[key] || 82;
}

// Horóscopo do casal do dia — ENTRETENIMENTO honesto, positivo, determinístico pela data.
const DAILY = [
  { tema: "Conexão", texto: "Hoje a sintonia de vocês está em alta — um bom dia pra uma conversa sem pressa.", dica: "Perguntem: qual foi o melhor momento da nossa semana?" },
  { tema: "Aventura", texto: "O céu pede movimento. Fujam da rotina, mesmo que num programa simples.", dica: "Planejem algo novo pra fazer juntos neste mês." },
  { tema: "Cuidado", texto: "Dia de desacelerar e cuidar um do outro. Pequenos gestos valem mais que grandes palavras.", dica: "Um abraço mais demorado hoje faz diferença." },
  { tema: "Paixão", texto: "A energia entre vocês está intensa. Aproveitem pra reacender o que já é forte.", dica: "Relembrem como tudo começou." },
  { tema: "Diálogo", texto: "Bom momento pra colocar sentimentos em palavras. Ouvir é o presente de hoje.", dica: "Deixem o celular de lado por 20 minutos." },
  { tema: "Gratidão", texto: "O dia favorece reconhecer o que vocês construíram. Celebrem as pequenas vitórias.", dica: "Digam um 'obrigado' específico um ao outro." },
  { tema: "Futuro", texto: "As estrelas convidam a sonhar juntos. Um bom dia pra falar de planos.", dica: "Guardem um desejo de vocês numa cápsula do tempo." },
  { tema: "Leveza", texto: "Hoje é dia de rir junto. Não levem as pequenas coisas tão a sério.", dica: "Relembrem uma história engraçada de vocês." },
];

export function dailyHoroscope(nameA, nameB, dateStr) {
  const a = signByName(nameA);
  const b = signByName(nameB);
  const key = `${dateStr}|${a ? a.element : "x"}|${b ? b.element : "y"}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return DAILY[h % DAILY.length];
}

// Números "cósmicos" do casal — só por diversão, determinístico pela semente (nomes + signos).
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

// Selo decorativo de "frequência" — ambientação mística, sem alegação de efeito real.
const FREQUENCIAS = [
  "528Hz · frequência do amor",
  "639Hz · conexão e relacionamentos",
  "432Hz · harmonia",
  "741Hz · expressão",
];
export function frequenciaFor(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return FREQUENCIAS[h % FREQUENCIAS.length];
}

// Cartas do casal — mecânica "escolha 3 cartas", com significados POSITIVOS (entretenimento).
// Sem leitura fria / diagnóstico de medo (isso é a parte manipuladora do original).
export const CARDS = [
  { name: "O Coração", emoji: "❤️", meaning: "amor e conexão sincera" },
  { name: "A Estrela", emoji: "✨", meaning: "esperança e sonhos que vocês compartilham" },
  { name: "A Viagem", emoji: "🧭", meaning: "aventuras esperando por vocês" },
  { name: "O Sol", emoji: "☀️", meaning: "alegria e dias luminosos juntos" },
  { name: "A Lua", emoji: "🌙", meaning: "intuição e intimidade" },
  { name: "O Laço", emoji: "🎀", meaning: "compromisso e cumplicidade" },
  { name: "A Chave", emoji: "🗝️", meaning: "um novo capítulo se abrindo" },
  { name: "O Brinde", emoji: "🥂", meaning: "celebração e momentos a dois" },
  { name: "O Lar", emoji: "🏡", meaning: "construir um lar juntos" },
];

// Lua — cálculo REAL de posição astronômica (biblioteca astronomy-engine, mesma
// usada por observatórios/apps de astronomia). Sem hora exata, usamos meio-dia UTC
// como referência neutra (a Lua muda de signo a cada ~2,3 dias, então a data já
// acerta o signo na maioria dos casos; com a hora, o resultado fica ainda mais preciso).
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

// Ascendente — precisa da cidade/coordenadas de nascimento pra ser calculado com precisão real
// (depende do horário sideral local). Sem essa informação, não afirmamos um valor "real".
export function risingSign() {
  return null;
}
