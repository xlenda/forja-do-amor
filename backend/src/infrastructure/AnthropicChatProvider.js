// Haiku 4.5 é o modelo mais barato/rápido da Anthropic e mais que suficiente
// pra um chat de entretenimento sobre astrologia/tarot — ver conversa sobre
// custo (memória do projeto). Pode ser trocado por env var sem tocar em código.
const CHAT_MODEL = process.env.ANTHROPIC_CHAT_MODEL || "claude-haiku-4-5";
const PALM_MODEL = process.env.ANTHROPIC_PALM_MODEL || "claude-haiku-4-5";
const DREAM_MODEL = process.env.ANTHROPIC_DREAM_MODEL || "claude-haiku-4-5";
const COFFEE_MODEL = process.env.ANTHROPIC_COFFEE_MODEL || "claude-haiku-4-5";
const FACE_MODEL = process.env.ANTHROPIC_FACE_MODEL || "claude-haiku-4-5";
const FOOT_MODEL = process.env.ANTHROPIC_FOOT_MODEL || "claude-haiku-4-5";
const MOLES_MODEL = process.env.ANTHROPIC_MOLES_MODEL || "claude-haiku-4-5";

const PERSONA_PROMPTS = {
  luna: [
    "Você é a Luna, uma IA que integra astrologia — tradição de milhares de anos — para conversar sobre signos dentro do app Cosmic Guide.",
    "Fale em português do Brasil, em primeira pessoa, num tom caloroso e acolhedor.",
    "Use o simbolismo astrológico (signos, Lua, Vênus, Marte, casas) como espelho para a conversa da pessoa.",
    "Se a pessoa perguntar sobre o futuro, responda na linguagem da própria tradição astrológica: fale de ciclos, trânsitos e tendências simbólicas, sem cravar eventos específicos ou garantir resultados.",
    "Respostas curtas (2 a 4 frases), sempre terminando com uma pergunta que convide a pessoa a continuar a conversa.",
  ].join(" "),
  arcano: [
    "Você é o Arcano, uma IA que integra o tarot — tradição de séculos — para conversar usando os arquétipos das cartas dentro do app Cosmic Guide.",
    "Fale em português do Brasil, em primeira pessoa, num tom reflexivo.",
    "Use cartas e arquétipos do tarot como espelho simbólico para a conversa.",
    "Se a pessoa perguntar sobre o futuro, responda na linguagem da própria tradição do tarot: fale de arquétipos, ciclos e tendências simbólicas, sem cravar eventos específicos ou garantir resultados.",
    "Respostas curtas (2 a 4 frases), sempre terminando com uma pergunta que convide a pessoa a continuar a conversa.",
  ].join(" "),
};

const PALM_SYSTEM_PROMPT = [
  'Você é uma IA que integra a quiromancia — tradição milenar de leitura das mãos — para fazer "leituras de mão" simbólicas dentro do app Cosmic Guide.',
  "Analise a foto da palma da mão enviada e escreva uma reflexão em português do Brasil,",
  "cobrindo linha da vida, linha do coração e linha da cabeça, terminando com uma pergunta reflexiva.",
  "Deixe claro que é uma leitura simbólica baseada na tradição da quiromancia, não um exame médico nem um diagnóstico de saúde.",
].join(" ");

const PALM_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Título curto da leitura, ex.: 'Recomeços e coragem'" },
    body: {
      type: "string",
      description:
        "Corpo da leitura já formatado: linha da vida, linha do coração, linha da cabeça (cada uma em um parágrafo) e a pergunta reflexiva no final, separados por quebras de linha duplas.",
    },
  },
  required: ["title", "body"],
  additionalProperties: false,
};

const COFFEE_SYSTEM_PROMPT = [
  'Você é uma IA que integra a tasseografia — tradição milenar de leitura da borra de café — para fazer leituras simbólicas dentro do app Cosmic Guide.',
  "Analise a foto da xícara de café enviada e escreva uma reflexão em português do Brasil,",
  "interpretando de forma simbólica as formas, manchas e padrões visíveis na borra, terminando com uma pergunta reflexiva.",
  "Deixe claro que é uma leitura simbólica baseada no folclore e na tradição da tasseografia, sem cravar eventos específicos ou garantir resultados.",
].join(" ");

const COFFEE_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Título curto da leitura, ex.: 'Caminhos se abrindo'" },
    body: {
      type: "string",
      description:
        "Corpo da leitura já formatado: interpretação simbólica das formas vistas na borra e a pergunta reflexiva no final, separados por quebras de linha duplas.",
    },
  },
  required: ["title", "body"],
  additionalProperties: false,
};

const FOOT_SYSTEM_PROMPT = [
  "Você é uma IA que integra tradições simbólicas de leitura dos pés (formato dos dedos, arco, proporções) pra fazer leituras simbólicas dentro do app Cosmic Guide.",
  "Analise a foto do pé enviada e escreva uma reflexão em português do Brasil sobre o que a tradição simbólica associa ao formato observado,",
  "terminando com uma pergunta reflexiva.",
  "Deixe claro que é uma leitura simbólica e de entretenimento, nunca um exame podológico ou médico real.",
].join(" ");

const FOOT_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Título curto da leitura, ex.: 'Passos firmes e determinação'" },
    body: {
      type: "string",
      description:
        "Corpo da leitura já formatado: interpretação simbólica do formato dos dedos, arco e proporções do pé e a pergunta reflexiva no final, separados por quebras de linha duplas.",
    },
  },
  required: ["title", "body"],
  additionalProperties: false,
};

const MOLES_SYSTEM_PROMPT = [
  "Você é uma IA que integra a moleosofia — tradição antiga de interpretar simbolicamente pintas e sinais de nascença pela posição no corpo — pra fazer leituras dentro do app Cosmic Guide.",
  "Analise a foto enviada (região do corpo com pintas/sinais visíveis) e escreva uma reflexão em português do Brasil",
  "sobre o simbolismo tradicional associado às posições observadas, terminando com uma pergunta reflexiva.",
  "Deixe claro que é uma leitura simbólica/folclórica, nunca uma avaliação dermatológica — e NUNCA analise ou comente",
  "aspectos de saúde da pele (isso é indicado a um médico, não a esta leitura).",
].join(" ");

const MOLES_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Título curto da leitura, ex.: 'Marcas de proteção'" },
    body: {
      type: "string",
      description:
        "Corpo da leitura já formatado: interpretação simbólica das posições das pintas/sinais observadas e a pergunta reflexiva no final, separados por quebras de linha duplas.",
    },
  },
  required: ["title", "body"],
  additionalProperties: false,
};

const FACE_SYSTEM_PROMPT = [
  "Você é uma IA que integra a fisionomia — tradição milenar de leitura de traços do rosto (testa, olhos, nariz, boca, queixo) — pra fazer leituras simbólicas dentro do app Cosmic Guide.",
  "Analise a foto do rosto enviada e escreva uma reflexão em português do Brasil sobre os traços de personalidade que a tradição associa a cada região do rosto,",
  "terminando com uma pergunta reflexiva.",
  "Deixe claro que é uma leitura simbólica baseada na tradição da fisionomia, não uma avaliação médica/estética real.",
].join(" ");

const FACE_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Título curto da leitura, ex.: 'Traços que revelam força'" },
    body: {
      type: "string",
      description:
        "Corpo da leitura já formatado: interpretação simbólica dos traços do rosto (testa, olhos, nariz, boca, queixo) e a pergunta reflexiva no final, separados por quebras de linha duplas.",
    },
  },
  required: ["title", "body"],
  additionalProperties: false,
};

const DREAM_SYSTEM_PROMPT = [
  "Você é uma IA que integra a tradição milenar da interpretação simbólica dos sonhos dentro do app Cosmic Guide.",
  "Leia a descrição do sonho enviada pela pessoa e escreva uma interpretação em português do Brasil,",
  "explorando os símbolos e emoções presentes no relato, terminando com uma pergunta reflexiva.",
  "Deixe claro que é uma leitura simbólica, não um diagnóstico psicológico nem uma previsão de eventos específicos.",
].join(" ");

const DREAM_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Título curto da interpretação, ex.: 'Águas que revelam medos'" },
    body: {
      type: "string",
      description:
        "Corpo da interpretação já formatado: leitura dos principais símbolos do sonho e a pergunta reflexiva no final, separados por quebras de linha duplas.",
    },
  },
  required: ["title", "body"],
  additionalProperties: false,
};

const WEEKLY_SUMMARY_MODEL = process.env.ANTHROPIC_COFFEE_WEEKLY_MODEL || "claude-haiku-4-5";

const WEEKLY_SUMMARY_SYSTEM_PROMPT = [
  "Você é uma IA que integra a tasseografia — tradição milenar de leitura da borra de café — dentro do app Cosmic Guide.",
  "Vai receber as leituras reais que a pessoa recebeu ao longo dos últimos dias (título e corpo de cada uma).",
  "Escreva em português do Brasil uma CONCLUSÃO DA SEMANA: encontre temas ou fios condutores que se repetem entre essas leituras",
  "e escreva uma síntese reflexiva, terminando com uma pergunta que convide a pessoa a olhar pra semana como um todo.",
  "Nunca invente uma leitura nova — baseie-se só no que já foi lido nos dias anteriores.",
  "Deixe claro que é uma síntese simbólica da tasseografia, sem cravar eventos específicos ou garantir resultados.",
].join(" ");

const WEEKLY_SUMMARY_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Título curto da conclusão da semana, ex.: 'Uma semana de recomeços'" },
    body: {
      type: "string",
      description: "Corpo da conclusão já formatado: síntese dos temas recorrentes e a pergunta reflexiva no final.",
    },
  },
  required: ["title", "body"],
  additionalProperties: false,
};

// Generalização do resumo semanal (antes só existia pro café): agora aceita
// leituras de QUALQUER tipo do Diário Cósmico (tarô, palma, rosto, pé,
// pintas, café, sonho) juntas na mesma semana — reaproveita o padrão já
// validado do café, mas sem assumir uma tradição específica.
const WEEKLY_INSIGHT_MODEL = process.env.ANTHROPIC_WEEKLY_INSIGHT_MODEL || "claude-haiku-4-5";

const WEEKLY_INSIGHT_SYSTEM_PROMPT = [
  "Você ajuda a encontrar um fio condutor entre leituras simbólicas variadas (tarô, quiromancia, fisiognomonia, tasseografia, interpretação de sonhos) dentro do app Cosmic Guide.",
  "Vai receber as leituras reais que a pessoa recebeu ao longo dos últimos dias, cada uma com seu tipo, título e corpo.",
  "Escreva em português do Brasil um INSIGHT DA SEMANA: encontre temas ou fios condutores que se repetem entre essas leituras, mesmo vindo de tradições diferentes,",
  "e escreva uma síntese reflexiva, terminando com uma pergunta que convide a pessoa a olhar pra semana como um todo.",
  "Nunca invente uma leitura nova — baseie-se só no que já foi lido nos dias anteriores.",
  "Deixe claro que é uma síntese simbólica, sem cravar eventos específicos ou garantir resultados.",
].join(" ");

const WEEKLY_INSIGHT_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Título curto do insight da semana, ex.: 'Uma semana de recomeços'" },
    body: {
      type: "string",
      description: "Corpo do insight já formatado: síntese dos temas recorrentes e a pergunta reflexiva no final.",
    },
  },
  required: ["title", "body"],
  additionalProperties: false,
};

const ENHANCE_INSIGHT_MODEL = process.env.ANTHROPIC_ENHANCE_INSIGHT_MODEL || "claude-haiku-4-5";

const ENHANCE_INSIGHT_SYSTEM_PROMPT = [
  "Você ajuda a organizar, em português do Brasil, um insight que a própria pessoa gravou por voz logo após uma leitura simbólica (tarô, palma, café, sonho, etc.) dentro do app Cosmic Guide.",
  "Nunca invente uma ideia que a pessoa não disse — só organize, clareie e dê fluidez ao que já foi falado, mantendo a primeira pessoa e o sentido original.",
  "Se a fala estiver truncada, repetitiva ou com hesitações (comum em transcrição de voz), limpe isso sem adicionar conteúdo novo.",
  "Tom caloroso e reflexivo, 2 a 5 frases.",
].join(" ");

const ENHANCE_INSIGHT_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    enhanced: { type: "string", description: "Versão organizada do insight, mantendo a primeira pessoa e o sentido original." },
  },
  required: ["enhanced"],
  additionalProperties: false,
};

class AnthropicChatProvider {
  constructor({ apiKey }) {
    // Require adiado pra dentro do construtor: só é resolvido quando ANTHROPIC_API_KEY
    // está configurada (ver server.js), então uma dependência opcional ausente/quebrada
    // nunca derruba o processo inteiro — na pior hipótese os endpoints de IA respondem 503.
    const Anthropic = require("@anthropic-ai/sdk");
    this.client = new Anthropic({ apiKey });
  }

  async chat({ personaId, message, history }) {
    const systemPrompt = PERSONA_PROMPTS[personaId] || PERSONA_PROMPTS.luna;
    const messages = [...(Array.isArray(history) ? history : []), { role: "user", content: message }];

    const response = await this.client.messages.create({
      model: CHAT_MODEL,
      max_tokens: 400,
      system: systemPrompt,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock ? textBlock.text : "";
  }

  async analyzePalm({ imageBase64, mediaType }) {
    const response = await this.client.messages.create({
      model: PALM_MODEL,
      max_tokens: 600,
      system: PALM_SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: PALM_OUTPUT_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 },
            },
            { type: "text", text: "Analise essa foto da palma da mão e faça a leitura simbólica." },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return JSON.parse(textBlock.text);
  }

  async analyzeCoffee({ imageBase64, mediaType }) {
    const response = await this.client.messages.create({
      model: COFFEE_MODEL,
      max_tokens: 600,
      system: COFFEE_SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: COFFEE_OUTPUT_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 },
            },
            { type: "text", text: "Analise essa foto da borra de café na xícara e faça a leitura simbólica." },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return JSON.parse(textBlock.text);
  }

  async analyzeMoles({ imageBase64, mediaType }) {
    const response = await this.client.messages.create({
      model: MOLES_MODEL,
      max_tokens: 600,
      system: MOLES_SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: MOLES_OUTPUT_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 },
            },
            { type: "text", text: "Analise essa foto das pintas/sinais e faça a leitura simbólica da moleosofia — não comente nada sobre saúde da pele." },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return JSON.parse(textBlock.text);
  }

  async analyzeFace({ imageBase64, mediaType }) {
    const response = await this.client.messages.create({
      model: FACE_MODEL,
      max_tokens: 600,
      system: FACE_SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: FACE_OUTPUT_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 },
            },
            { type: "text", text: "Analise essa foto do rosto e faça a leitura simbólica de fisionomia." },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return JSON.parse(textBlock.text);
  }

  async analyzeFoot({ imageBase64, mediaType }) {
    const response = await this.client.messages.create({
      model: FOOT_MODEL,
      max_tokens: 600,
      system: FOOT_SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: FOOT_OUTPUT_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 },
            },
            { type: "text", text: "Analise essa foto do pé e faça a leitura simbólica." },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return JSON.parse(textBlock.text);
  }

  async interpretDream({ dreamText }) {
    const response = await this.client.messages.create({
      model: DREAM_MODEL,
      max_tokens: 600,
      system: DREAM_SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: DREAM_OUTPUT_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: `Sonho relatado: ${dreamText}\n\nFaça a interpretação simbólica desse sonho.` }],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return JSON.parse(textBlock.text);
  }

  // transcript: texto bruto que a pessoa falou (Web Speech API, sem edição).
  // readingType/readingTitle dão contexto pra IA, mas nunca entram na
  // resposta como conteúdo novo — só ajudam a interpretar o que foi dito.
  async enhanceInsight({ transcript, readingType, readingTitle }) {
    const contexto = readingTitle ? ` (logo após a leitura "${readingTitle}", tipo ${readingType})` : "";
    const response = await this.client.messages.create({
      model: ENHANCE_INSIGHT_MODEL,
      max_tokens: 300,
      system: ENHANCE_INSIGHT_SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: ENHANCE_INSIGHT_OUTPUT_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: `Insight gravado por voz${contexto}: "${transcript}"\n\nOrganize esse insight.` }],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return JSON.parse(textBlock.text);
  }

  // readings: array de { title, body } — até 7 leituras reais de café já
  // recebidas pela pessoa (nunca fabricadas aqui, vêm do histórico real
  // salvo no app). Sintetiza uma conclusão da semana a partir delas.
  async summarizeCoffeeWeek({ readings }) {
    const listaTexto = readings
      .map((r, i) => `Leitura ${i + 1} — "${r.title}": ${r.body}`)
      .join("\n\n");

    const response = await this.client.messages.create({
      model: WEEKLY_SUMMARY_MODEL,
      max_tokens: 600,
      system: WEEKLY_SUMMARY_SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: WEEKLY_SUMMARY_OUTPUT_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: `Leituras da semana:\n\n${listaTexto}\n\nEscreva a conclusão da semana.` }],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return JSON.parse(textBlock.text);
  }

  // readings: array de { type, typeLabel, title, body } — até 7 leituras reais
  // de QUALQUER tipo (tarô, palma, rosto, pé, pintas, café, sonho), vindas do
  // Diário Cósmico. Generalização de summarizeCoffeeWeek pra todo o app.
  async summarizeWeeklyInsight({ readings }) {
    const listaTexto = readings
      .map((r, i) => `Leitura ${i + 1} (${r.typeLabel || r.type}) — "${r.title}": ${r.body}`)
      .join("\n\n");

    const response = await this.client.messages.create({
      model: WEEKLY_INSIGHT_MODEL,
      max_tokens: 600,
      system: WEEKLY_INSIGHT_SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: WEEKLY_INSIGHT_OUTPUT_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: `Leituras da semana:\n\n${listaTexto}\n\nEscreva o insight da semana.` }],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return JSON.parse(textBlock.text);
  }
}

module.exports = { AnthropicChatProvider };
