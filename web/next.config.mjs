/** @type {import('next').NextConfig} */
// basePath "/oraculo" existe pro deploy atual na VPS, onde este export estático
// divide o domínio oddpro.pro com outros projetos (nginx monta essa pasta em
// /oraculo/). Na Vercel, o projeto vira dono do próprio domínio/root, então não
// faz sentido manter esse prefixo — process.env.VERCEL já vem setado pela
// própria Vercel durante o build, sem precisar de nenhuma env var nova.
const nextConfig = {
  output: "export",
  basePath: process.env.VERCEL ? undefined : "/oraculo",
  trailingSlash: true,
};

export default nextConfig;
