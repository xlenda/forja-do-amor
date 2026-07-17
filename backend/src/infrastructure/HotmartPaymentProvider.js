// Primeira implementação concreta de PaymentProvider — trocável por outra sem
// tocar em domínio, casos de uso ou rotas HTTP.

const crypto = require("crypto");
const { PaymentProvider } = require("../domain/PaymentProvider");

// Comparação em tempo constante — evita ataque de timing que vazaria, char a char,
// quantos caracteres do HOTTOK recebido batem com o segredo configurado.
function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(String(a), "utf8");
  const bufB = Buffer.from(String(b), "utf8");
  if (bufA.length !== bufB.length) {
    // Ainda compara contra um buffer do mesmo tamanho de bufA (nunca bufB) pra não
    // retornar cedo e vazar informação de tamanho/tempo — sempre false ao final.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// Mapeia os eventos/estado do Hotmart para o vocabulário interno (pending/active/past_due/canceled/expired).
function normalizeStatus({ event, subscriptionStatus }) {
  if (subscriptionStatus === "ACTIVE") return "active";
  if (subscriptionStatus === "STARTED") return "active";
  if (subscriptionStatus === "OVERDUE") return "past_due";
  if (subscriptionStatus === "CANCELLED_BY_CUSTOMER" || subscriptionStatus === "CANCELLED_BY_SELLER" || subscriptionStatus === "CANCELLED_BY_ADMIN") {
    return "canceled";
  }
  if (event === "PURCHASE_APPROVED" || event === "PURCHASE_COMPLETE") return "active";
  if (event === "PURCHASE_CANCELED") return "canceled";
  if (event === "PURCHASE_REFUNDED" || event === "PURCHASE_CHARGEBACK" || event === "PURCHASE_EXPIRED") return "expired";
  return null;
}

class HotmartPaymentProvider extends PaymentProvider {
  constructor({ hottok, offerCode }) {
    super();
    if (!hottok) throw new Error("HotmartPaymentProvider precisa de hottok (token do webhook configurado no painel Hotmart)");
    this.hottok = hottok;
    this.offerCode = offerCode;
  }

  async initiateCheckout({ correlationCode, coupleName, customerEmail }) {
    // Checkout Elements é montado no NAVEGADOR (biblioteca JS do Hotmart) — aqui só
    // devolvemos a configuração pronta pro frontend chamar checkoutElements.init(...).
    return {
      provider: "hotmart",
      renderMode: "inline",
      offerCode: this.offerCode,
      xcod: correlationCode,
      prefilledInfo: {
        name: coupleName || undefined,
        email: customerEmail || undefined,
      },
    };
  }

  verifyWebhookSignature(rawBody, headers) {
    const received = headers["x-hotmart-hottok"] || headers["X-HOTMART-HOTTOK"];
    return Boolean(received) && timingSafeStringEqual(received, this.hottok);
  }

  parseWebhookEvent(payload) {
    const event = payload?.event || null;
    const purchase = payload?.data?.purchase || {};
    const subscription = payload?.data?.subscription || {};
    const correlationCode = purchase?.origin?.xcod || null;
    const status = normalizeStatus({ event, subscriptionStatus: subscription?.status });

    return {
      correlationCode,
      status,
      providerSubscriptionId: subscription?.subscriber?.code || purchase?.transaction || null,
      amountCents: purchase?.price?.value != null ? Math.round(purchase.price.value * 100) : null,
      currency: purchase?.price?.currency_value || null,
      // Data da próxima cobrança (ISO 8601), confirmada em data.subscription.date_next_charge
      // na documentação oficial do Hotmart — mesmo objeto de onde já lemos subscription.status.
      currentPeriodEnd: subscription?.date_next_charge || null,
      rawEvent: event,
    };
  }
}

module.exports = { HotmartPaymentProvider };
