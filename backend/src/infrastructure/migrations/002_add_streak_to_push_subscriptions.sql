-- Sincroniza o estado de sequência (hoje só existe no AsyncStorage do
-- aparelho) pro servidor poder decidir quem notificar à noite quando a
-- sequência está em risco (scripts/send-streak-risk-push.js).
ALTER TABLE push_subscriptions ADD COLUMN last_active_date TEXT;
ALTER TABLE push_subscriptions ADD COLUMN current_streak INTEGER DEFAULT 0;
