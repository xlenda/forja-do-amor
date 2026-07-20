-- GET /users/:userId e GET /feed filtram social_posts por user_id, mas só
-- existia índice por created_at — full table scan proporcional ao total de
-- posts da PLATAFORMA inteira em toda visita de perfil/feed.
CREATE INDEX IF NOT EXISTS idx_social_posts_user_created ON social_posts(user_id, created_at DESC);

-- social_follows só tinha PRIMARY KEY(follower_id, followee_id), que serve
-- buscas por follower_id mas não por followee_id. Contar seguidores (GET
-- /users/:userId) faz SELECT COUNT(*) WHERE followee_id = ? e não conseguia
-- usar a PK — table scan completo em toda visita de QUALQUER perfil.
CREATE INDEX IF NOT EXISTS idx_social_follows_followee ON social_follows(followee_id);
