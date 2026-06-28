function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getRelevantWords(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((word) => word.length >= 3);
}

function calculateRelevance(product, watchlistItem) {
  const productTitle = normalizeText(product.title);
  const watchQuery = normalizeText(watchlistItem.query || watchlistItem.name);

  const queryWords = getRelevantWords(watchQuery);

  if (!queryWords.length) {
    return {
      score: 0,
      matchedWords: [],
      queryWords,
      relevant: false
    };
  }

  const matchedWords = queryWords.filter((word) => productTitle.includes(word));
  const score = matchedWords.length / queryWords.length;

  return {
    score,
    matchedWords,
    queryWords,
    relevant: score >= 0.6
  };
}

function isRelevant(product, watchlistItem, minimumScore = 0.6) {
  return calculateRelevance(product, watchlistItem).score >= minimumScore;
}

module.exports = {
  normalizeText,
  getRelevantWords,
  calculateRelevance,
  isRelevant
};