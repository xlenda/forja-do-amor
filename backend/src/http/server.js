const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const { SubscriptionRepository } = require("../infrastructure/SubscriptionRepository");
const { HotmartPaymentProvider } = require("../infrastructure/HotmartPaymentProvider");
const { AnthropicChatProvider } = require("../infrastructure/AnthropicChatProvider");
const { PushSubscriptionRepository } = require("../infrastructure/PushSubscriptionRepository");
const { socialRouter } = require("./socialRoutes");
const { buildAdminRouter } = require("./adminRoutes");
const { compressImage } = require("../infrastructure/imageProcessing");
const { InitiateCheckoutUseCase } = require("../application/InitiateCheckoutUseCase");
const { ProcessWebhookUseCase } = require("../application/ProcessWebhookUseCase");
const { GetSubscriptionStatusUseCase } = require("../application/GetSubscriptionStatusUseCase");

const PORT = process.env.PORT || 3005;
const HOTMART_HOTTOK = process.env.HOTMART_HOTTOK || "";
const HOTMART_OFFER_CODE = process.env.HOTMART_OFFER_CODE || "";
// Lista separada por vírgula — este backend atende DOIS frontends (o funil em
// oddpro.pro e o app Cosmic Guide em cosmicguide.cloud). Antes disso só um
// valor era possível, então cosmicguide.cloud nunca batia com o Access-Control-
// Allow-Origin devolvido e o navegador bloqueava silenciosamente toda chamada
// de /api/chat, /api/palm, /api/coffee e /api/dream vinda do app — o fallback
// mockado honesto (lib/aiClient.js no app) escondia o erro, então a IA real
// nunca respondeu em produção sem que ninguém percebesse.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || "https://oddpro.pro")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "";
// Sem essa var configurada, /api/admin/* responde 503 em vez de aceitar
// qualquer token (nunca abre a rota "sem querer" por falta de configuração).
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

// Troca de processador de pagamento no futuro = trocar só esta linha por outra classe
// que implemente a mesma interface PaymentProvider. Nada abaixo precisa mudar.
const paymentProvider = new HotmartPaymentProvider({ hottok: HOTMART_HOTTOK, offerCode: HOTMART_OFFER_CODE });
const repository = new SubscriptionRepository();
const pushRepository = new PushSubscriptionRepository();

const initiateCheckout = new InitiateCheckoutUseCase(repository, paymentProvider);
const processWebhook = new ProcessWebhookUseCase(repository, paymentProvider);
const getSubscriptionStatus = new GetSubscriptionStatusUseCase(repository);

// Sem chave configurada, os endpoints /api/chat, /api/palm, /api/coffee e /api/dream
// respondem 503 em vez de derrubar o processo — permite subir o deploy antes de a chave existir.
const aiProvider = ANTHROPIC_API_KEY ? new AnthropicChatProvider({ apiKey: ANTHROPIC_API_KEY }) : null;

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(
  express.json({
    limit: "10mb", // fotos em base64 (leitura de mão) passam do limite padrão de 100kb
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

// Sem isso, qualquer um que descubra a URL pode martelar os endpoints de IA
// (cada chamada custa de verdade na conta da Anthropic) ou spammar criação de
// assinaturas pendentes. Limite por IP — generoso o bastante pro uso real do
// app, restritivo o bastante pra impedir abuso automatizado.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições — tente novamente em alguns minutos." },
});

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições — tente novamente em alguns minutos." },
});

app.post("/api/checkout/initiate", checkoutLimiter, async (req, res) => {
  try {
    const { coupleName, customerEmail, plan, amountCents, currency } = req.body || {};
    const result = await initiateCheckout.execute({ coupleName, customerEmail, plan, amountCents, currency });
    res.json(result);
  } catch (err) {
    // Antes vazava err.message cru pro cliente — único lugar da API que fazia
    // isso, podendo expor detalhe interno (erro de driver do banco, mensagem
    // de exceção do provider de pagamento). Achado real de auditoria (18/07/2026).
    console.error("[api/checkout/initiate] erro:", err.message);
    res.status(500).json({ error: "falha ao iniciar checkout" });
  }
});

app.get("/api/subscription/:correlationCode", (req, res) => {
  const result = getSubscriptionStatus.execute({ correlationCode: req.params.correlationCode });
  if (!result) return res.status(404).json({ error: "não encontrado" });
  res.json(result);
});

// Mesmo limite do maxLength={500} do TextInput em ChatScreen.js — o client já
// trava a digitação nesse tamanho, isso aqui é a garantia server-side (um
// cliente alterado ou uma chamada direta à API não deve conseguir gastar
// tokens da Anthropic com uma mensagem gigante).
const CHAT_MESSAGE_MAX_LENGTH = 500;

app.post("/api/chat", aiLimiter, async (req, res) => {
  if (!aiProvider) return res.status(503).json({ error: "IA não configurada no servidor" });
  try {
    const { personaId, message, history } = req.body || {};
    if (!message) return res.status(400).json({ error: "message é obrigatório" });
    if (typeof message !== "string" || message.length > CHAT_MESSAGE_MAX_LENGTH) {
      return res.status(400).json({ error: `message deve ter no máximo ${CHAT_MESSAGE_MAX_LENGTH} caracteres` });
    }
    const reply = await aiProvider.chat({ personaId, message, history });
    console.log("[api/chat] sucesso");
    res.json({ reply });
  } catch (err) {
    console.error("[api/chat] erro:", err.message);
    res.status(500).json({ error: "falha ao gerar resposta" });
  }
});

app.post("/api/palm", aiLimiter, async (req, res) => {
  if (!aiProvider) return res.status(503).json({ error: "IA não configurada no servidor" });
  try {
    const { imageBase64, mediaType } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: "imageBase64 é obrigatório" });
    const compressed = await compressImage(imageBase64, mediaType);
    const reading = await aiProvider.analyzePalm(compressed);
    console.log("[api/palm] sucesso");
    res.json(reading);
  } catch (err) {
    console.error("[api/palm] erro:", err.message);
    res.status(500).json({ error: "falha ao analisar a imagem" });
  }
});

app.post("/api/coffee", aiLimiter, async (req, res) => {
  if (!aiProvider) return res.status(503).json({ error: "IA não configurada no servidor" });
  try {
    const { imageBase64, mediaType } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: "imageBase64 é obrigatório" });
    const compressed = await compressImage(imageBase64, mediaType);
    const reading = await aiProvider.analyzeCoffee(compressed);
    console.log("[api/coffee] sucesso");
    res.json(reading);
  } catch (err) {
    console.error("[api/coffee] erro:", err.message);
    res.status(500).json({ error: "falha ao analisar a imagem" });
  }
});

app.post("/api/moles", aiLimiter, async (req, res) => {
  if (!aiProvider) return res.status(503).json({ error: "IA não configurada no servidor" });
  try {
    const { imageBase64, mediaType } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: "imageBase64 é obrigatório" });
    const compressed = await compressImage(imageBase64, mediaType);
    const reading = await aiProvider.analyzeMoles(compressed);
    console.log("[api/moles] sucesso");
    res.json(reading);
  } catch (err) {
    console.error("[api/moles] erro:", err.message);
    res.status(500).json({ error: "falha ao analisar a imagem" });
  }
});

app.post("/api/foot", aiLimiter, async (req, res) => {
  if (!aiProvider) return res.status(503).json({ error: "IA não configurada no servidor" });
  try {
    const { imageBase64, mediaType } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: "imageBase64 é obrigatório" });
    const compressed = await compressImage(imageBase64, mediaType);
    const reading = await aiProvider.analyzeFoot(compressed);
    console.log("[api/foot] sucesso");
    res.json(reading);
  } catch (err) {
    console.error("[api/foot] erro:", err.message);
    res.status(500).json({ error: "falha ao analisar a imagem" });
  }
});

app.post("/api/face", aiLimiter, async (req, res) => {
  if (!aiProvider) return res.status(503).json({ error: "IA não configurada no servidor" });
  try {
    const { imageBase64, mediaType } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: "imageBase64 é obrigatório" });
    const compressed = await compressImage(imageBase64, mediaType);
    const reading = await aiProvider.analyzeFace(compressed);
    console.log("[api/face] sucesso");
    res.json(reading);
  } catch (err) {
    console.error("[api/face] erro:", err.message);
    res.status(500).json({ error: "falha ao analisar a imagem" });
  }
});

// Mesmo limite do maxLength={2000} do TextInput em DreamScreen.js — mesma
// lógica do CHAT_MESSAGE_MAX_LENGTH acima.
const DREAM_TEXT_MAX_LENGTH = 2000;

app.post("/api/dream", aiLimiter, async (req, res) => {
  if (!aiProvider) return res.status(503).json({ error: "IA não configurada no servidor" });
  try {
    const { dreamText } = req.body || {};
    if (!dreamText) return res.status(400).json({ error: "dreamText é obrigatório" });
    if (typeof dreamText !== "string" || dreamText.length > DREAM_TEXT_MAX_LENGTH) {
      return res.status(400).json({ error: `dreamText deve ter no máximo ${DREAM_TEXT_MAX_LENGTH} caracteres` });
    }
    const reading = await aiProvider.interpretDream({ dreamText });
    console.log("[api/dream] sucesso");
    res.json(reading);
  } catch (err) {
    console.error("[api/dream] erro:", err.message);
    res.status(500).json({ error: "falha ao interpretar o sonho" });
  }
});

const INSIGHT_TRANSCRIPT_MAX_LENGTH = 2000;

app.post("/api/enhance-insight", aiLimiter, async (req, res) => {
  if (!aiProvider) return res.status(503).json({ error: "IA não configurada no servidor" });
  try {
    const { transcript, readingType, readingTitle } = req.body || {};
    if (!transcript) return res.status(400).json({ error: "transcript é obrigatório" });
    if (typeof transcript !== "string" || transcript.length > INSIGHT_TRANSCRIPT_MAX_LENGTH) {
      return res.status(400).json({ error: `transcript deve ter no máximo ${INSIGHT_TRANSCRIPT_MAX_LENGTH} caracteres` });
    }
    const result = await aiProvider.enhanceInsight({ transcript, readingType, readingTitle });
    console.log("[api/enhance-insight] sucesso");
    res.json(result);
  } catch (err) {
    console.error("[api/enhance-insight] erro:", err.message);
    res.status(500).json({ error: "falha ao organizar o insight" });
  }
});

// Feed social só pra usuários solo (sem parceiro pareado — ver isCouple no
// app); Reconectar/Agir e o resto do conteúdo de casal nunca passam por aqui.
// Cada rota exige um JWT válido do Supabase (ver socialAuth.js).
app.use("/api/social", socialRouter);

// Rotas de suporte/admin (buscar/forçar status de assinatura) — protegidas
// por ADMIN_TOKEN (header X-Admin-Token), nunca abertas sem essa var setada.
app.use("/api/admin", buildAdminRouter({ repository, adminToken: ADMIN_TOKEN }));

// Web Push — o app Cosmic Guide roda só como web (sem publicação em loja),
// então notificação de celular só existe através disso (ver lib/webPush.js no
// app): a chave pública é a mesma pra todo mundo (por definição, é pública),
// subscribe/unsubscribe guardam/apagam a inscrição real do navegador da
// pessoa, junto do signo dela (não-sensível) pra personalizar o envio diário.
const pushLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições — tente novamente em alguns minutos." },
});

app.get("/api/push/vapid-public-key", (_req, res) => {
  if (!VAPID_PUBLIC_KEY) return res.status(503).json({ error: "Web Push não configurado no servidor" });
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

app.post("/api/push/subscribe", pushLimiter, (req, res) => {
  try {
    const { subscription, sign } = req.body || {};
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: "subscription (endpoint + keys) é obrigatório" });
    }
    const { p256dh, auth } = subscription.keys;
    if (!p256dh || !auth) return res.status(400).json({ error: "subscription.keys.p256dh e .auth são obrigatórios" });

    pushRepository.save({
      endpoint: subscription.endpoint,
      p256dh,
      auth,
      signName: sign && sign.name,
      signIcon: sign && sign.icon,
    });
    console.log("[api/push/subscribe] inscrição salva");
    res.json({ ok: true });
  } catch (err) {
    console.error("[api/push/subscribe] erro:", err.message);
    res.status(500).json({ error: "falha ao salvar inscrição" });
  }
});

app.post("/api/push/unsubscribe", pushLimiter, (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: "endpoint é obrigatório" });
    pushRepository.remove(endpoint);
    res.json({ ok: true });
  } catch (err) {
    console.error("[api/push/unsubscribe] erro:", err.message);
    res.status(500).json({ error: "falha ao remover inscrição" });
  }
});

app.post("/api/coffee-weekly-summary", aiLimiter, async (req, res) => {
  if (!aiProvider) return res.status(503).json({ error: "IA não configurada no servidor" });
  try {
    const { readings } = req.body || {};
    if (!Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ error: "readings (array não vazio) é obrigatório" });
    }
    if (readings.length > 7) {
      return res.status(400).json({ error: "readings aceita no máximo 7 leituras" });
    }
    for (const r of readings) {
      if (!r || typeof r.title !== "string" || typeof r.body !== "string") {
        return res.status(400).json({ error: "cada leitura precisa de title e body em string" });
      }
    }
    const summary = await aiProvider.summarizeCoffeeWeek({ readings });
    console.log("[api/coffee-weekly-summary] sucesso");
    res.json(summary);
  } catch (err) {
    console.error("[api/coffee-weekly-summary] erro:", err.message);
    res.status(500).json({ error: "falha ao gerar a conclusão da semana" });
  }
});

// Generalização do resumo semanal acima — aceita leituras de QUALQUER tipo do
// Diário Cósmico (tarô, palma, rosto, pé, pintas, café, sonho) juntas.
app.post("/api/weekly-insight", aiLimiter, async (req, res) => {
  if (!aiProvider) return res.status(503).json({ error: "IA não configurada no servidor" });
  try {
    const { readings } = req.body || {};
    if (!Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ error: "readings (array não vazio) é obrigatório" });
    }
    if (readings.length > 7) {
      return res.status(400).json({ error: "readings aceita no máximo 7 leituras" });
    }
    for (const r of readings) {
      if (!r || typeof r.title !== "string" || typeof r.body !== "string") {
        return res.status(400).json({ error: "cada leitura precisa de title e body em string" });
      }
    }
    const summary = await aiProvider.summarizeWeeklyInsight({ readings });
    console.log("[api/weekly-insight] sucesso");
    res.json(summary);
  } catch (err) {
    console.error("[api/weekly-insight] erro:", err.message);
    res.status(500).json({ error: "falha ao gerar o insight da semana" });
  }
});

// Generoso o bastante pra nunca bloquear reentregas legítimas do Hotmart (raras,
// um evento por compra/mudança de assinatura), restritivo o bastante pra impedir
// que alguém martele esse endpoint público não-autenticado.
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, reason: "muitas requisições" },
});

app.post("/webhook/hotmart", webhookLimiter, (req, res) => {
  console.log("[webhook] recebido:", JSON.stringify(req.body));
  try {
    const result = processWebhook.execute({ rawBody: req.rawBody, headers: req.headers, payload: req.body });
    console.log("[webhook] resultado:", JSON.stringify(result));
    // Sempre responde 200 pro Hotmart não ficar reentregando — o motivo de falha vai só no log/resposta.
    res.json(result);
  } catch (err) {
    // Sem este try/catch, uma falha inesperada aqui (ex.: escrita no banco) virava
    // um 500 do Express — o oposto do que o comentário acima promete — fazendo o
    // Hotmart reentregar o mesmo evento indefinidamente, com a ativação da compra
    // seguindo sem registro a cada tentativa.
    console.error("[webhook] erro inesperado:", err.message);
    res.json({ ok: false, reason: "erro interno ao processar" });
  }
});

// Middleware de erro central — precisa ser o ÚLTIMO app.use, depois de toda
// rota. Sem isso, uma exceção não tratada (ex.: duas requisições simultâneas
// de PUT /api/social/profile com o mesmo username: as duas passam pela
// checagem de "já existe" antes de qualquer INSERT terminar, e a segunda
// esbarra na constraint UNIQUE do banco) sobe pro handler padrão do Express,
// que devolve HTML — quebrando o contrato {error} que o resto da API segue.
// Achado real de auditoria (18/07/2026).
app.use((err, req, res, _next) => {
  if (err && err.code === "SQLITE_CONSTRAINT_UNIQUE") {
    return res.status(409).json({ error: "esse valor já está em uso" });
  }
  console.error("[erro não tratado]", err && err.message);
  res.status(500).json({ error: "erro interno" });
});

app.listen(PORT, () => {
  console.log(`Forja del Amor backend rodando na porta ${PORT}`);
});
