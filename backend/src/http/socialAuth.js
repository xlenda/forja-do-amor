// Verifica o JWT que o app Cosmic Guide manda (Authorization: Bearer <token>,
// vindo de supabase.auth.getSession().access_token no client) SEM precisar da
// service_role key — o Lenda pediu explicitamente pra nunca usar/guardar essa
// chave neste projeto. Esse projeto Supabase assina os tokens com ES256
// assimétrico (confirmado em .well-known/jwks.json), então dá pra verificar a
// assinatura só com a chave pública, via JWKS, com cache automático do jose.
const { createRemoteJWKSet, jwtVerify } = require("jose");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://eblbohgizzishfgtcnmc.supabase.co";
const JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

// Middleware Express: exige um token válido, popula req.userId com o "sub"
// (UUID estável do usuário) e req.userEmail. Nunca confia em user_id vindo
// cru do corpo/query da requisição — é sempre derivado do token verificado.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "token de autenticação ausente" });

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${SUPABASE_URL}/auth/v1`,
      audience: "authenticated",
    });
    req.userId = payload.sub;
    req.userEmail = payload.email || null;
    next();
  } catch (err) {
    console.error("[socialAuth] token inválido:", err.message);
    res.status(401).json({ error: "token inválido ou expirado" });
  }
}

module.exports = { requireAuth };
