# 05 — Backend Schema · Gilfforever
**Banco de dados, autenticação e notificações**

## 1. Entidades principais (Postgres)

### users
- id (uuid, pk)
- name
- email (unique)
- auth_provider (email | apple | google)
- push_token
- created_at

### couples
- id (uuid, pk)
- title (ex.: "Ana & Léo")
- start_date (data de início do relacionamento)
- created_by (fk users)
- created_at

### couple_members  (relação usuário ↔ casal, N:N mas na prática 2)
- id (pk)
- couple_id (fk couples)
- user_id (fk users)
- role (owner | partner)
- joined_at
- (unique: couple_id + user_id)

### memories
- id (uuid, pk)
- couple_id (fk couples)  ← chave de isolamento (RLS)
- author_id (fk users)
- type (photo | video | audio | text)
- caption
- memory_date (data do momento, pode ser passado)
- tags (array/text)
- created_at

### media_assets
- id (pk)
- memory_id (fk memories, nullable — cápsula também usa)
- storage_key (R2/Storage)
- thumbnail_key
- mime_type
- size_bytes
- created_at

### time_capsules  (motor de recorrência)
- id (uuid, pk)
- couple_id (fk couples)
- author_id (fk users)
- message
- media_asset_id (fk, nullable)
- unlock_at (timestamp — quando abre)
- sealed (bool, default true)
- delivered (bool, default false)  ← controle idempotente do job
- created_at

### important_dates
- id (pk)
- couple_id (fk)
- label (aniversário | primeiro encontro | custom)
- date
- remind (bool)

### subscriptions
- id (pk)
- couple_id (fk)  ← 1 assinatura serve o casal
- provider (revenuecat | stripe)
- status (trialing | active | canceled | expired)
- plan (monthly | annual)
- trial_ends_at
- current_period_end
- external_id

### notifications
- id (pk)
- user_id (fk)
- type (capsule_unlock | anniversary | partner_invite | recap)
- payload (jsonb)
- scheduled_for (timestamp, nullable)
- sent_at (nullable)

## 2. Autenticação
- E-mail/senha + Apple + Google (Apple obrigatório nas lojas).
- **Convite do parceiro:** código/deep link → cria `couple_members` com role=partner.
- Sessão via JWT/refresh (Supabase Auth resolve isso pronto).

## 3. Isolamento de dados (crítico — memórias íntimas)
- **RLS por couple_id:** todo acesso a memories/media/capsules filtra pelo casal do usuário logado. Ninguém vê memória de outro casal.
- URLs de mídia **assinadas e expiráveis** (nunca públicas).

## 4. Notificações & agendamento
- **Cápsulas:** job (cron/queue) roda periodicamente, busca `time_capsules` com `unlock_at <= now()` e `delivered=false`, dispara push, marca `delivered=true` (idempotente, com retry).
- **Aniversários/datas:** job diário verifica `important_dates` e agenda push.
- **Retrospectiva anual:** job anual gera o "ano de vocês" e notifica.
- Push via Expo/FCM/APNs usando `users.push_token`.

## 5. Índices e cuidados
- Índice em `memories(couple_id, memory_date)` → timeline rápida.
- Índice em `time_capsules(unlock_at, delivered)` → job eficiente.
- Soft-delete + exportação completa por casal (LGPD/confiança).
