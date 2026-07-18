// Feed social entre leitores solo do Cosmic Guide (inspirado no app de
// leitura Ziggur, mas escopo bem menor: sem seguidores públicos de conteúdo
// de casal — Reconectar/Agir e o resto continuam privados). Uma pessoa
// escolhe compartilhar uma leitura já feita (do Diário Cósmico) no feed;
// outras podem seguir, curtir e comentar. Tudo autenticado via JWT do
// Supabase verificado por JWKS (ver socialAuth.js) — nunca confia num
// user_id vindo cru do corpo da requisição.
const express = require("express");
const rateLimit = require("express-rate-limit");
const { db } = require("../infrastructure/db");
const { requireAuth } = require("./socialAuth");

const router = express.Router();
router.use(requireAuth);

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições — tente novamente em alguns minutos." },
});

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const TITLE_MAX = 120;
const BODY_MAX = 2000;
const COMMENT_MAX = 500;

function nowIso() {
  return new Date().toISOString();
}

function profileOrNull(userId) {
  return db.prepare("SELECT user_id, display_name, username, avatar_emoji FROM social_profiles WHERE user_id = ?").get(userId) || null;
}

// Toda rota abaixo assume req.userId já verificado por requireAuth.

router.get("/profile/me", (req, res) => {
  res.json({ profile: profileOrNull(req.userId) });
});

router.put("/profile", writeLimiter, (req, res) => {
  const { displayName, username, avatarEmoji } = req.body || {};
  if (!displayName || typeof displayName !== "string" || !displayName.trim()) {
    return res.status(400).json({ error: "displayName é obrigatório" });
  }
  const cleanUsername = String(username || "").trim().toLowerCase();
  if (!USERNAME_RE.test(cleanUsername)) {
    return res.status(400).json({ error: "username deve ter 3-20 caracteres (letras minúsculas, números, _)" });
  }
  const taken = db.prepare("SELECT user_id FROM social_profiles WHERE username = ? AND user_id != ?").get(cleanUsername, req.userId);
  if (taken) return res.status(409).json({ error: "username já está em uso" });

  const existing = profileOrNull(req.userId);
  const ts = nowIso();
  if (existing) {
    db.prepare("UPDATE social_profiles SET display_name = ?, username = ?, avatar_emoji = ?, updated_at = ? WHERE user_id = ?")
      .run(displayName.trim().slice(0, 60), cleanUsername, avatarEmoji || null, ts, req.userId);
  } else {
    db.prepare(
      "INSERT INTO social_profiles (user_id, display_name, username, avatar_emoji, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(req.userId, displayName.trim().slice(0, 60), cleanUsername, avatarEmoji || null, ts, ts);
  }
  res.json({ profile: profileOrNull(req.userId) });
});

// Busca simples por username (prefixo) — não existe diretório público de
// usuários ainda, então é assim que uma pessoa acha outra pra seguir (ex.:
// combinar o @username por fora, tipo Ziggur "Compartilhar perfil").
router.get("/search", (req, res) => {
  const q = String(req.query.username || "").trim().toLowerCase();
  if (!q) return res.json({ profiles: [] });
  const rows = db
    .prepare("SELECT user_id, display_name, username, avatar_emoji FROM social_profiles WHERE username LIKE ? ORDER BY username LIMIT 20")
    .all(`${q}%`);
  res.json({ profiles: rows });
});

router.get("/users/:userId", (req, res) => {
  const profile = profileOrNull(req.params.userId);
  if (!profile) return res.status(404).json({ error: "perfil não encontrado" });
  const followers = db.prepare("SELECT COUNT(*) c FROM social_follows WHERE followee_id = ?").get(req.params.userId).c;
  const following = db.prepare("SELECT COUNT(*) c FROM social_follows WHERE follower_id = ?").get(req.params.userId).c;
  const isFollowing = !!db
    .prepare("SELECT 1 FROM social_follows WHERE follower_id = ? AND followee_id = ?")
    .get(req.userId, req.params.userId);
  const posts = db
    .prepare("SELECT id, reading_type, title, body, created_at FROM social_posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 30")
    .all(req.params.userId);
  res.json({ profile, followers, following, isFollowing: req.userId === req.params.userId ? null : isFollowing, posts });
});

router.post("/follow/:userId", writeLimiter, (req, res) => {
  if (req.params.userId === req.userId) return res.status(400).json({ error: "não pode seguir a si mesmo" });
  if (!profileOrNull(req.params.userId)) return res.status(404).json({ error: "perfil não encontrado" });
  db.prepare("INSERT OR IGNORE INTO social_follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)").run(
    req.userId,
    req.params.userId,
    nowIso()
  );
  res.json({ ok: true });
});

router.delete("/follow/:userId", writeLimiter, (req, res) => {
  db.prepare("DELETE FROM social_follows WHERE follower_id = ? AND followee_id = ?").run(req.userId, req.params.userId);
  res.json({ ok: true });
});

// Feed = posts de quem eu sigo + meus próprios posts, mais recentes primeiro.
// `before` (id de post) pagina pro passado — evita ORDER BY OFFSET caro à
// medida que o feed cresce.
router.get("/feed", (req, res) => {
  const before = Number.parseInt(req.query.before, 10) || Number.MAX_SAFE_INTEGER;
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 50);

  const rows = db
    .prepare(
      `SELECT p.id, p.user_id, p.reading_type, p.title, p.body, p.created_at,
              sp.display_name, sp.username, sp.avatar_emoji,
              (SELECT COUNT(*) FROM social_likes l WHERE l.post_id = p.id) as like_count,
              (SELECT COUNT(*) FROM social_comments c WHERE c.post_id = p.id) as comment_count,
              EXISTS(SELECT 1 FROM social_likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) as liked_by_me
       FROM social_posts p
       JOIN social_profiles sp ON sp.user_id = p.user_id
       WHERE p.id < ?
         AND (p.user_id = ? OR p.user_id IN (SELECT followee_id FROM social_follows WHERE follower_id = ?))
       ORDER BY p.id DESC
       LIMIT ?`
    )
    .all(req.userId, before, req.userId, req.userId, limit);

  res.json({ posts: rows.map((r) => ({ ...r, liked_by_me: !!r.liked_by_me })) });
});

router.post("/posts", writeLimiter, (req, res) => {
  if (!profileOrNull(req.userId)) return res.status(400).json({ error: "crie seu perfil social antes de compartilhar (PUT /api/social/profile)" });
  const { readingType, title, body } = req.body || {};
  if (!title || typeof title !== "string" || !body || typeof body !== "string") {
    return res.status(400).json({ error: "title e body são obrigatórios" });
  }
  if (title.length > TITLE_MAX || body.length > BODY_MAX) {
    return res.status(400).json({ error: `title deve ter no máximo ${TITLE_MAX} e body ${BODY_MAX} caracteres` });
  }
  const info = db
    .prepare("INSERT INTO social_posts (user_id, reading_type, title, body, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(req.userId, readingType || null, title, body, nowIso());
  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete("/posts/:id", writeLimiter, (req, res) => {
  const post = db.prepare("SELECT user_id FROM social_posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "post não encontrado" });
  if (post.user_id !== req.userId) return res.status(403).json({ error: "só quem publicou pode apagar" });
  db.prepare("DELETE FROM social_posts WHERE id = ?").run(req.params.id);
  db.prepare("DELETE FROM social_likes WHERE post_id = ?").run(req.params.id);
  db.prepare("DELETE FROM social_comments WHERE post_id = ?").run(req.params.id);
  res.json({ ok: true });
});

router.post("/posts/:id/like", writeLimiter, (req, res) => {
  if (!db.prepare("SELECT 1 FROM social_posts WHERE id = ?").get(req.params.id)) {
    return res.status(404).json({ error: "post não encontrado" });
  }
  db.prepare("INSERT OR IGNORE INTO social_likes (post_id, user_id, created_at) VALUES (?, ?, ?)").run(req.params.id, req.userId, nowIso());
  res.json({ ok: true });
});

router.delete("/posts/:id/like", writeLimiter, (req, res) => {
  db.prepare("DELETE FROM social_likes WHERE post_id = ? AND user_id = ?").run(req.params.id, req.userId);
  res.json({ ok: true });
});

router.get("/posts/:id/comments", (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.id, c.user_id, c.body, c.created_at, sp.display_name, sp.username, sp.avatar_emoji
       FROM social_comments c JOIN social_profiles sp ON sp.user_id = c.user_id
       WHERE c.post_id = ? ORDER BY c.id ASC LIMIT 200`
    )
    .all(req.params.id);
  res.json({ comments: rows });
});

router.post("/posts/:id/comments", writeLimiter, (req, res) => {
  if (!profileOrNull(req.userId)) return res.status(400).json({ error: "crie seu perfil social antes de comentar" });
  if (!db.prepare("SELECT 1 FROM social_posts WHERE id = ?").get(req.params.id)) {
    return res.status(404).json({ error: "post não encontrado" });
  }
  const { body } = req.body || {};
  if (!body || typeof body !== "string" || !body.trim()) return res.status(400).json({ error: "body é obrigatório" });
  if (body.length > COMMENT_MAX) return res.status(400).json({ error: `body deve ter no máximo ${COMMENT_MAX} caracteres` });
  const info = db
    .prepare("INSERT INTO social_comments (post_id, user_id, body, created_at) VALUES (?, ?, ?, ?)")
    .run(req.params.id, req.userId, body.trim(), nowIso());
  res.status(201).json({ id: info.lastInsertRowid });
});

module.exports = { socialRouter: router };
