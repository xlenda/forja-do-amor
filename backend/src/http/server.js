const express = require("express");
const cors = require("cors");

const { SubscriptionRepository } = require("../infrastructure/SubscriptionRepository");
const { HotmartPaymentProvider } = require("../infrastructure/HotmartPaymentProvider");
const { InitiateCheckoutUseCase } = require("../application/InitiateCheckoutUseCase");
const { ProcessWebhookUseCase } = require("../application/ProcessWebhookUseCase");
const { GetSubscriptionStatusUseCase } = require("../application/GetSubscriptionStatusUseCase");

const PORT = process.env.PORT || 3005;
const HOTMART_HOTTOK = process.env.HOTMART_HOTTOK || "";
const HOTMART_OFFER_CODE = process.env.HOTMART_OFFER_CODE || "";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://oddpro.pro";

// Troca de processador de pagamento no futuro = trocar só esta linha por outra classe
// que implemente a mesma interface PaymentProvider. Nada abaixo precisa mudar.
const paymentProvider = new HotmartPaymentProvider({ hottok: HOTMART_HOTTOK, offerCode: HOTMART_OFFER_CODE });
const repository = new SubscriptionRepository();

const initiateCheckout = new InitiateCheckoutUseCase(repository, paymentProvider);
const processWebhook = new ProcessWebhookUseCase(repository, paymentProvider);
const getSubscriptionStatus = new GetSubscriptionStatusUseCase(repository);

const app = express();
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/checkout/initiate", async (req, res) => {
  try {
    const { coupleName, customerEmail, plan, amountCents, currency } = req.body || {};
    const result = await initiateCheckout.execute({ coupleName, customerEmail, plan, amountCents, currency });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/subscription/:correlationCode", (req, res) => {
  const result = getSubscriptionStatus.execute({ correlationCode: req.params.correlationCode });
  if (!result) return res.status(404).json({ error: "não encontrado" });
  res.json(result);
});

app.post("/webhook/hotmart", (req, res) => {
  console.log("[webhook] recebido:", JSON.stringify(req.body));
  const result = processWebhook.execute({ rawBody: req.rawBody, headers: req.headers, payload: req.body });
  console.log("[webhook] resultado:", JSON.stringify(result));
  // Sempre responde 200 pro Hotmart não ficar reentregando — o motivo de falha vai só no log/resposta.
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Forja del Amor backend rodando na porta ${PORT}`);
});
