const COLORS = [
  "preto", "preta", "branco", "branca", "azul", "vermelho", "vermelha",
  "verde", "rosa", "roxo", "roxa", "cinza", "grafite", "silver", "black",
  "white", "blue", "red", "green", "pink", "purple", "gray", "grey"
];

const NOISE_WORDS = [
  "mouse", "gamer", "sem", "com", "fio", "wireless", "rgb", "led",
  "ultraleve", "ergonomico", "ergonômico", "design", "sensor", "optico",
  "óptico", "botoes", "botões", "dpi", "tri", "mode", "usb", "preto",
  "branco", "branca", "produto", "patrocinado", "frete", "gratis", "grátis"
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removeNoiseWords(words) {
  return words.filter((word) => {
    if (!word || word.length < 2) return false;
    if (COLORS.includes(word)) return false;
    if (NOISE_WORDS.includes(word)) return false;
    if (/^\d+$/.test(word) && word.length < 4) return false;
    return true;
  });
}

function extractCanonicalName(title) {
  const normalized = normalizeText(title);
  const words = normalized.split(/\s+/);
  const cleanWords = removeNoiseWords(words);

  return cleanWords.slice(0, 6).join(" ");
}

function createProductIdentity(product) {
  const title = product?.title || product?.name || "";
  const canonicalName = extractCanonicalName(title);

  const productKey = canonicalName
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    canonicalName,
    productKey,
    sourceTitle: title
  };
}

module.exports = {
  normalizeText,
  extractCanonicalName,
  createProductIdentity
};