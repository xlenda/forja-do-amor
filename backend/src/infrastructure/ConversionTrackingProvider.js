// Confirmação de Purchase server-side via Meta Conversions API. InitiateCheckout
// já é medido client-side (lib/conversionTracking.js no app, trackInitiateCheckout
// no funil web) — mas a confirmação real da compra só chega pelo webhook
// (assíncrono, muitas vezes sem a aba/app aberto pra disparar um evento client-side
// de Purchase), então é isto aqui que garante que o Pixel recebe o evento de
// verdade. Nunca lança pra fora de trackPurchase de um jeito que derrube o
// processamento do webhook — ver uso fire-and-forget em ProcessWebhookUseCase.
const crypto = require("crypto");

const META_GRAPH_VERSION = "v21.0";

function hashEmail(email) {
  return crypto.createHash("sha256").update(String(email).trim().toLowerCase()).digest("hex");
}

class ConversionTrackingProvider {
  constructor({ pixelId, accessToken }) {
    this.pixelId = pixelId;
    this.accessToken = accessToken;
  }

  async trackPurchase({ correlationCode, amountCents, currency, customerEmail }) {
    const body = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          // Mesmo correlationCode como event_id — se um dia existir Purchase
          // client-side também, o Meta deduplica os dois pelo mesmo event_id
          // em vez de contar a mesma compra duas vezes.
          event_id: correlationCode,
          action_source: "website",
          user_data: customerEmail ? { em: [hashEmail(customerEmail)] } : {},
          custom_data: {
            value: (amountCents || 0) / 100,
            currency: currency || "USD",
          },
        },
      ],
    };

    const resp = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${this.pixelId}/events?access_token=${this.accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Conversions API respondeu ${resp.status}: ${text}`);
    }
  }
}

module.exports = { ConversionTrackingProvider };
