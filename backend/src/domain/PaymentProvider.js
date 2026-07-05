// Interface abstrata de processador de pagamento (Dependency Inversion).
// Qualquer processador novo (Stripe, PagSeguro, etc.) implementa esta classe —
// o resto do sistema (casos de uso, rotas HTTP) nunca depende do provedor concreto.

class PaymentProvider {
  /**
   * Devolve a configuração que o frontend precisa para montar o checkout embutido.
   * @param {{ correlationCode: string, coupleName: string, customerEmail?: string }} params
   * @returns {Promise<object>}
   */
  async initiateCheckout(params) {
    throw new Error("initiateCheckout não implementado");
  }

  /**
   * Confere se a requisição de webhook realmente veio do processador (assinatura/token).
   * @param {string} rawBody
   * @param {Record<string, string>} headers
   * @returns {boolean}
   */
  verifyWebhookSignature(rawBody, headers) {
    throw new Error("verifyWebhookSignature não implementado");
  }

  /**
   * Normaliza o payload específico do provedor para um formato comum e agnóstico.
   * @param {object} payload
   * @returns {{ correlationCode: string|null, status: string|null, providerSubscriptionId: string|null, amountCents: number|null, currency: string|null, rawEvent: string }}
   */
  parseWebhookEvent(payload) {
    throw new Error("parseWebhookEvent não implementado");
  }
}

module.exports = { PaymentProvider };
