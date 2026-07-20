class ProcessWebhookUseCase {
  constructor(repository, paymentProvider, conversionTracker) {
    this.repository = repository;
    this.paymentProvider = paymentProvider;
    // Opcional — null quando FB_PIXEL_ID/FB_CONVERSIONS_API_TOKEN não estão
    // configurados (ver server.js). Nunca bloqueia nem derruba o
    // processamento do webhook (achado real de auditoria, 19/07/2026).
    this.conversionTracker = conversionTracker || null;
  }

  // rawBody: string bruta (necessária pra validar assinatura); headers: headers HTTP; payload: JSON já parseado.
  execute({ rawBody, headers, payload }) {
    const signatureOk = this.paymentProvider.verifyWebhookSignature(rawBody, headers);
    if (!signatureOk) {
      // correlation_code é NOT NULL em subscription_events (schema em infrastructure/db.js) e o
      // payload ainda nem foi parseado aqui, então não existe correlationCode de verdade — usamos
      // um marcador textual em vez de null pra não violar a constraint e perder o registro de auditoria.
      this.repository.logEvent({
        correlationCode: "(sem correlationCode)",
        fromStatus: null,
        toStatus: null,
        rawEvent: "REJEITADO(assinatura inválida)",
        rawPayload: payload,
      });
      return { ok: false, reason: "assinatura inválida" };
    }

    const event = this.paymentProvider.parseWebhookEvent(payload);

    // Dedupe de reentrega (achado real de auditoria, 18/07/2026): sem isso,
    // um reenvio fora de ordem do Hotmart podia reaplicar uma transição já
    // processada (ex.: reativar algo que já tinha sido cancelado depois).
    if (this.repository.wasEventProcessed(event.eventId)) {
      this.repository.logEvent({
        correlationCode: event.correlationCode || "(sem correlationCode)",
        fromStatus: null,
        toStatus: null,
        rawEvent: `IGNORADO(evento duplicado, id=${event.eventId}): ${event.rawEvent}`,
        rawPayload: payload,
      });
      return { ok: true, duplicate: true };
    }

    if (!event.correlationCode) {
      this.repository.logEvent({
        correlationCode: "(sem correlationCode)",
        fromStatus: null,
        toStatus: null,
        rawEvent: "REJEITADO(sem correlationCode no payload)",
        rawPayload: payload,
      });
      return { ok: false, reason: "sem correlationCode (xcod) no payload" };
    }

    const subscription = this.repository.findByCorrelationCode(event.correlationCode);
    if (!subscription) {
      this.repository.logEvent({
        correlationCode: event.correlationCode,
        fromStatus: null,
        toStatus: null,
        rawEvent: "REJEITADO(correlationCode desconhecido)",
        rawPayload: payload,
      });
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
    if (event.currentPeriodEnd) subscription.currentPeriodEnd = event.currentPeriodEnd;

    this.repository.save(subscription);
    this.repository.logEvent({
      correlationCode: event.correlationCode,
      fromStatus,
      toStatus: subscription.status,
      rawEvent: event.rawEvent,
      rawPayload: payload,
    });
    // Só marca como processado DEPOIS que a transição de estado real já foi
    // salva — se uma reentrega chegar entre o save() e aqui (nunca acontece
    // de fato, é síncrono, mas por clareza), a reentrega ainda seria pega.
    this.repository.markEventProcessed(event.eventId);

    // Purchase = primeira ativação real (pending -> active), nunca uma
    // renovação nem qualquer outra transição. Fire-and-forget: execute()
    // é síncrono (better-sqlite3) e o Hotmart precisa de resposta rápida do
    // webhook — uma falha na Conversions API (rede, token revogado) nunca
    // pode atrasar nem derrubar o processamento real da compra.
    if (this.conversionTracker && fromStatus === "pending" && subscription.status === "active") {
      this.conversionTracker
        .trackPurchase({
          correlationCode: event.correlationCode,
          amountCents: subscription.amountCents,
          currency: subscription.currency,
          customerEmail: subscription.customerEmail,
        })
        .catch((err) => console.error("[conversion-tracking] falha ao enviar Purchase:", err.message));
    }

    return { ok: true, status: subscription.status };
  }
}

module.exports = { ProcessWebhookUseCase };
