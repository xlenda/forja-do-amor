-- Adiciona e-mail do cliente à assinatura (achado real de auditoria,
-- 18/07/2026): InitiateCheckoutUseCase já recebia customerEmail mas nunca
-- persistia — se o cliente contatasse suporte sem o correlationCode (que só
-- existe no aparelho dele), não tinha como localizar a assinatura pelo e-mail.
ALTER TABLE subscriptions ADD COLUMN customer_email TEXT;
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_email ON subscriptions(customer_email);
