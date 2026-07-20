class InitiateCheckoutUseCase {
  constructor(repository, paymentProvider) {
    this.repository = repository;
    this.paymentProvider = paymentProvider;
  }

  async execute({ coupleName, customerEmail, plan = "monthly", amountCents = 500, currency = "USD" }) {
    const subscription = this.repository.createPending({
      coupleName,
      provider: "hotmart",
      plan,
      amountCents,
      currency,
      customerEmail,
    });

    const checkoutConfig = await this.paymentProvider.initiateCheckout({
      correlationCode: subscription.correlationCode,
      coupleName,
      customerEmail,
    });

    return { correlationCode: subscription.correlationCode, checkoutConfig };
  }
}

module.exports = { InitiateCheckoutUseCase };
