// Rotas de suporte/administração — pra quando o webhook do Hotmart falhar,
// atrasar, ou o cliente contatar sem o correlationCode em mãos. Sem isso, a
// única forma de mexer numa assinatura era editar o SQLite direto via SSH
// (achado real de auditoria, 18/07/2026).
const express = require("express");
const rateLimit = require("express-rate-limit");
const { STATUSES } = require("../domain/Subscription");
const { timingSafeStringEqual } = require("../infrastructure/timingSafeCompare");

function buildAdminRouter({ repository, adminToken }) {
  const router = express.Router();

  const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas requisições — tente novamente em alguns minutos." },
  });
  router.use(adminLimiter);

  router.use((req, res, next) => {
    if (!adminToken) return res.status(503).json({ error: "rotas admin não configuradas no servidor (ADMIN_TOKEN ausente)" });
    const received = req.headers["x-admin-token"];
    if (!received || !timingSafeStringEqual(received, adminToken)) {
      return res.status(401).json({ error: "token admin inválido" });
    }
    next();
  });

  // Suporte sem correlationCode em mãos — só o e-mail que o cliente lembra.
  router.get("/subscriptions/search", (req, res) => {
    const email = String(req.query.email || "").trim();
    if (!email) return res.status(400).json({ error: "email é obrigatório" });
    const subs = repository.findByCustomerEmail(email);
    res.json({ subscriptions: subs });
  });

  router.get("/subscriptions/:correlationCode", (req, res) => {
    const sub = repository.findByCorrelationCode(req.params.correlationCode);
    if (!sub) return res.status(404).json({ error: "não encontrado" });
    res.json({ subscription: sub });
  });

  // Força uma transição de status manualmente — pra quando o webhook falhou/
  // atrasou/reentregou fora de ordem e o suporte precisa corrigir na hora.
  // NUNCA pula a máquina de estados (Subscription.transitionTo ainda valida
  // a transição) — evita um estado impossível mesmo com override manual.
  router.post("/subscriptions/:correlationCode/status", (req, res) => {
    const { status, reason } = req.body || {};
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `status deve ser um de: ${STATUSES.join(", ")}` });
    }
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({ error: "reason é obrigatório (fica registrado no histórico da assinatura)" });
    }
    const subscription = repository.findByCorrelationCode(req.params.correlationCode);
    if (!subscription) return res.status(404).json({ error: "não encontrado" });

    const fromStatus = subscription.status;
    try {
      subscription.transitionTo(status);
    } catch (err) {
      return res.status(409).json({ error: err.message });
    }
    repository.save(subscription);
    repository.logEvent({
      correlationCode: subscription.correlationCode,
      fromStatus,
      toStatus: subscription.status,
      rawEvent: `ADMIN_OVERRIDE(${reason.trim()})`,
      rawPayload: null,
    });
    res.json({ ok: true, subscription });
  });

  return router;
}

module.exports = { buildAdminRouter };
