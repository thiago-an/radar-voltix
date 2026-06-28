const { extractProductsFromHtml } = require("../crawlers/productExtraction");

const STORE_PATTERNS = [
  ["Amazon", /\bamazon\b/i],
  ["Kabum", /\bkabum\b/i],
  ["Magazine Luiza", /\b(?:magalu|magazine\s+luiza)\b/i],
  ["Mercado Livre", /\bmercado\s+livre\b/i],
  ["Pichau", /\bpichau\b/i],
  ["Terabyte", /\bterabyte(?:shop)?\b/i],
  ["Casas Bahia", /\bcasas\s+bahia\b/i],
  ["Fast Shop", /\bfast\s*shop\b/i],
  ["AliExpress", /\baliexpress\b/i],
  ["Shopee", /\bshopee\b/i]
];

function detectStore(product, fallback) {
  const text = `${product.title || ""} ${product.raw?.text || ""}`;
  return STORE_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] || fallback;
}

function extractDealsFromHtml(html, definition, baseUrl, sourceName) {
  return extractProductsFromHtml(html, definition, baseUrl).map((product) => ({
    ...product,
    store: detectStore(product, sourceName),
    source: sourceName,
    availability: /expirad[oa]|encerrad[oa]/i.test(product.raw?.text || "")
      ? "unavailable"
      : product.availability
  }));
}

module.exports = {
  detectStore,
  extractDealsFromHtml
};
