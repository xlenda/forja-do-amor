// Haiku 4.5 é o modelo mais barato/rápido da Anthropic e mais que suficiente
// pra um chat de entretenimento sobre astrologia/tarot — ver conversa sobre
// custo (memória do projeto). Pode ser trocado por env var sem tocar em código.
const CHAT_MODEL = process.env.ANTHROPIC_CHAT_MODEL || "claude-haiku-4-5";
const PALM_MODEL = process.env.ANTHROPIC_PALM_MODEL || "claude-haiku-4-5";
const DREAM_MODEL = process.env.ANTHROPIC_DREAM_MODEL || "claude-haiku-4-5";
const COFFEE_MODEL = process.env.ANTHROPIC_COFFEE_MODEL || "claude-haiku-4-5";

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
}

module.exports = { AnthropicChatProvider };
