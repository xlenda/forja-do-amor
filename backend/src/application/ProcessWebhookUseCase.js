class ProcessWebhookUseCase {
  constructor(repository, paymentProvider) {
    this.repository = repository;
    this.paymentProvider = paymentProvider;
  }

  // rawBody: string bruta (necessária pra validar assinatura); headers: headers HTTP; payload: JSON já parseado.
  execute({ rawBody, headers, payload }) {
    const signatureOk = this.paymentProvider.verifyWebhookSignature(rawBody, headers);
    if (!signatureOk) {
      return { ok: false, reason: "assinatura inválida" };
    }

    const event = this.paymentProvider.parseWebhookEvent(payload);
    if (!event.correlationCode) {
      return { ok: false, reason: "sem correlationCode (xcod) no payload" };
    }

    const subscription = this.repository.findByCorrelationCode(event.correlationCode);
    if (!subscription) {
      return { ok: false, reason: "correlationCode desconhecido" };
    }

    const fromStatus = subscription.status;
    if (event.status) {
      try {
        subscription.transitionTo(event.status);
      } catch (err) {
        // Evento fora de ordem (ex: webhook duplicado ou reentregue) — registra mas não derruba o processo.
        this.repository.logEvent({
          correlationCode: event.correlationCode,
          fromStatus,
          toStatus: fromStatus,
          rawEvent: `IGNORADO(${err.message}): ${event.rawEvent}`,
          rawPayload: payload,
        });
        return { ok: true, ignored: true, reason: err.message };
      }
    }

    if (event.amountCents) subscription.amountCents = event.amountCents;
    if (event.currency) subscription.currency = event.currency;
    if (event.providerSubscriptionId) subscription.providerSubscriptionId = event.providerSubscriptionId;

    this.repository.save(subscription);
    this.repository.logEvent({
      correlationCode: event.correlationCode,
      fromStatus,
      toStatus: subscription.status,
      rawEvent: event.rawEvent,
      rawPayload: payload,
    });

    return { ok: true, status: subscription.status };
  }
}

module.exports = { ProcessWebhookUseCase };
