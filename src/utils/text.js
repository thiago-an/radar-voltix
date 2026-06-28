function compactText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

const PRODUCT_TITLE_NOISE_PATTERNS = [
  /\b(?:produto\s+)?patrocinad[oa]\b/giu,
  /\bavalia(?:\u00e7\u00e3o|cao)\s+\d+(?:[.,]\d+)?\s+de\s+\d+(?:[.,]\d+)?(?:\s*\(\d+\))?/giu,
  /\bavalia(?:\u00e7\u00e3o|cao|\u00e7\u00f5es|coes)\s*:?/giu,
  /\b\d(?:[.,]\d)?\s*\(\d+\s+avalia(?:c|\u00e7)(?:a|\u00e3)o(?:es|\u00f5es)?\)/giu,
  /\bfrete\s+gr(?:a|\u00e1)tis\b(?:\s+para\s+[^|,;]+)?/giu,
  /\bdesconto\s*:?\s*-?\s*\d+(?:[.,]\d+)?\s*%/giu,
  /\b(?:no|via|com\s+desconto\s+no)\s+pix\b/giu,
  /\b(?:ou\s+)?\d+\s*(?:x|vez(?:es)?)\s+de\s+r\$\s*[\d.]+(?:,\d{1,2})?(?:\s+sem\s+juros)?/giu,
  /\b(?:em\s+at[eé]\s+)?\d+\s*x\s+sem\s+juros\b/giu,
  /\bresta(?:m)?\s+\d+\s+unid(?:ades?)?\.?/giu
];

function cleanProductTitle(value) {
  let title = String(value || "")
    .replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Zl}\p{Zp}]/gu, " ")
    .replace(/[\p{So}\uFE0F]/gu, " ");

  for (const pattern of PRODUCT_TITLE_NOISE_PATTERNS) {
    title = title.replace(pattern, " ");
  }

  const priceMatch = title.match(/r\$\s*\d[\d.]*(?:,\d{1,2})?/iu);

  if (priceMatch?.index !== undefined) {
    title = title.slice(0, priceMatch.index);
  }

  return compactText(title)
    .replace(/^[|,:;\-\s]+/, "")
    .replace(/[|,:;\-\s]+$/, "")
    .trim();
}

function normalizeText(value) {
  return compactText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

module.exports = {
  compactText,
  cleanProductTitle,
  normalizeText,
  slugify,
  onlyDigits
};
