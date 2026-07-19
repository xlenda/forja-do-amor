// Comprime/redimensiona a foto ANTES de mandar pra Claude — sem isso, uma
// foto de câmera de celular (facilmente 3-4000px, vários MB) é paga em
// resolução nativa em 5 endpoints diferentes (palma/café/pintas/pé/rosto),
// sem nenhum ganho real de qualidade pra uma leitura simbólica. Achado real
// de auditoria de custo (18/07/2026).
const sharp = require("sharp");

const MAX_DIMENSION = 1024; // lado maior, mantendo proporção
const JPEG_QUALITY = 82;

// Devolve { imageBase64, mediaType } já comprimido — sempre reencoda como
// JPEG (mesmo se a entrada já for JPEG), então mediaType da saída é sempre
// "image/jpeg" independente do formato original.
async function compressImage(base64, mediaType) {
  const inputBuffer = Buffer.from(base64, "base64");
  const outputBuffer = await sharp(inputBuffer)
    .rotate() // aplica a orientação EXIF antes de redimensionar (fotos de celular vêm com isso)
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  return { imageBase64: outputBuffer.toString("base64"), mediaType: "image/jpeg" };
}

module.exports = { compressImage, MAX_DIMENSION, JPEG_QUALITY };
