# 02 — TRD · Gilfforever
**Technical Requirements Document**

## 1. Decisão de plataforma
App de memórias com muita mídia (foto/vídeo/áudio) + notificações agendadas (cápsulas) + entregue no final de um funil de WhatsApp/DM.

**Recomendação:** **app mobile cross-platform com Expo (React Native)** — um código, iOS + Android, push nativo confiável (essencial pras cápsulas). Um **PWA/landing em Next.js** entra como porta de entrada (deep link do funil → app).

Por que não SQLite/Express puro como no Mission Control: app de mídia com muitos usuários precisa de storage de objetos + banco que escale. Mantemos TypeScript (que você já domina) em todo o stack.

## 2. Stack recomendada
| Camada | Escolha | Motivo |
|--------|---------|--------|
| App | Expo (React Native) + TypeScript | iOS+Android num código, push nativo |
| Porta de entrada | Next.js (PWA/landing) | Deep link do funil, SEO, web |
| Backend/API | Supabase (Postgres + Auth + Storage + Edge Functions) **ou** Node/Express + Prisma + Postgres | Rápido de subir; Postgres escala (SQLite não serve pra mídia) |
| Storage de mídia | Cloudflare R2 ou Supabase Storage + CDN | Custo baixo por GB, entrega rápida |
| Push | Expo Push (FCM + APNs) | Dispara cápsulas e lembretes |
| Assinaturas | **RevenueCat** (sobre App Store/Play) + Stripe (web) | Gerencia assinatura in-app sem dor; Stripe pro checkout web |
| Agendamento (cápsulas) | Cron/queue (Supabase cron, ou worker Node + BullMQ) | Abre cápsula na data certa e dispara push |
| Analytics | PostHog (produto) + eventos de funil | Ativação, retenção, conversão trial→pago |

## 3. Integrações necessárias
- **Autenticação:** e-mail/senha + login social (Apple obrigatório na App Store, Google).
- **Pagamento/assinatura:** RevenueCat (mobile) + Stripe (web/PIX no Brasil). Teste grátis de 7 dias, cancelamento com 1 toque.
- **Push notifications:** Expo/FCM/APNs — cápsulas, lembretes de aniversário, convite do parceiro.
- **Storage + CDN de mídia:** upload direto do app pro R2/Storage (URLs assinadas), thumbnails gerados no upload.
- **Convite do parceiro:** deep link / código de convite (2 usuários → 1 casal).

## 4. Requisitos não-funcionais
- **Privacidade/segurança:** memórias são íntimas. Criptografia em trânsito (TLS) e em repouso; URLs de mídia assinadas e expiráveis; RLS (row-level security) por casal — ninguém acessa memória de outro casal.
- **Exportação de dados:** usuário pode exportar tudo (fotos, textos, cápsulas). Reduz churn por medo e é diferencial de confiança.
- **Offline-first (fase 2):** ver linha do tempo já baixada sem internet.
- **Performance:** timeline paginada; mídia lazy-load; thumbnails.
- **Confiabilidade das cápsulas:** a cápsula PRECISA abrir na data certa — job idempotente, com retry e log de entrega.

## 5. Ambientes
- Dev → Staging → Produção. Deploy do backend na infra que você já tem (VPS Ubuntu) ou Supabase gerenciado. App via EAS Build (Expo) pras lojas.

## 6. Riscos técnicos
| Risco | Mitigação |
|-------|-----------|
| Custo de storage de vídeo cresce rápido | R2 (egress barato), limites por plano, compressão no upload |
| Cápsula não dispara na hora | Scheduler idempotente + monitoramento + retry |
| Aprovação nas lojas (assinatura) | RevenueCat + seguir guidelines (Apple/Google) desde o início |
| Sincronização casal (2 editando) | Modelo de dados com ownership por casal + timestamps |
