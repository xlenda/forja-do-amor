const crypto = require("crypto");

// Comparação em tempo constante — evita ataque de timing que vazaria, char a
// char, quantos caracteres do segredo recebido batem com o configurado.
// Extraído de HotmartPaymentProvider.js (era privado lá) pra ser reusado
// também na verificação do token admin — lógica de segurança não se duplica.
function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(String(a), "utf8");
  const bufB = Buffer.from(String(b), "utf8");
  if (bufA.length !== bufB.length) {
    // Ainda compara contra um buffer do mesmo tamanho de bufA (nunca bufB) pra não
    // retornar cedo e vazar informação de tamanho/tempo — sempre false ao final.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = { timingSafeStringEqual };
