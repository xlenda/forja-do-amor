class GetSubscriptionStatusUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  execute({ correlationCode }) {
    const subscription = this.repository.findByCorrelationCode(correlationCode);
    if (!subscription) return null;
    return {
      status: subscription.status,
      hasAccess: subscription.hasAccess(),
      plan: subscription.plan,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }
}

module.exports = { GetSubscriptionStatusUseCase };
