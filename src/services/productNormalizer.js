const crypto = require("crypto");
const { env } = require("../config/env");
const logger = require("../utils/logger");
const { cleanProductTitle, compactText, normalizeText } = require("../utils/text");

const STOP_WORDS = new Set([
  "a",
  "as",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "para",
  "por",
  "produto",
  "original",
  "novo",
  "nova",
  "oferta",
  "promocao",
  "promoção"
]);

function removeAccents(value) {
  return compactText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeTitle(title) {
  return normalizeText(removeAccents(cleanProductTitle(title)))
    .replace(/[^a-z0-9\s.-]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function preserveRawProduct(product, originalTitle) {
  if (product.raw && typeof product.raw === "object" && !Array.isArray(product.raw)) {
    return product.raw.title
      ? product.raw
      : { ...product.raw, title: originalTitle };
  }

  const { raw: _raw, ...snapshot } = product;
  return { ...snapshot, title: originalTitle };
}

function logTitleCleaning(originalTitle, cleanedTitle) {
  if (env.nodeEnv !== "development" || originalTitle === cleanedTitle) {
    return;
  }

  logger.info(`Titulo original: ${originalTitle}`);
  logger.info(`Titulo limpo: ${cleanedTitle}`);
}

function generateProductHash(product) {
  const normalizedTitle = product.normalizedTitle || normalizeTitle(product.title || product.productTitle);

  return crypto
    .createHash("sha256")
    .update(normalizedTitle)
    .digest("hex");
}

function normalizeProduct(product) {
  const originalTitle = String(product.productTitle || product.title || "");
  const productTitle = cleanProductTitle(originalTitle);
  const normalizedTitle = normalizeTitle(productTitle);
  const productHash = product.productHash || generateProductHash({
    ...product,
    normalizedTitle
  });

  logTitleCleaning(compactText(originalTitle), productTitle);

  return {
    ...product,
    raw: preserveRawProduct(product, originalTitle),
    title: productTitle,
    productTitle,
    normalizedTitle,
    productHash
  };
}

module.exports = {
  cleanProductTitle,
  removeAccents,
  normalizeTitle,
  generateProductHash,
  normalizeProduct
};
