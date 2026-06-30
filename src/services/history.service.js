const priceHistoryRepository = require("../repositories/priceHistory.repository");
const productNormalizer = require("./productNormalizer");
const { parseMoney, roundMoney } = require("../utils/money");

const DUPLICATE_WINDOW_MINUTES = 30;

function normalizeHistoryInput(product) {
  const normalizedProduct = productNormalizer.normalizeProduct(product);
  const price = parseMoney(product.price);
  const oldPrice = parseMoney(product.oldPrice);

  if (!normalizedProduct.productTitle) {
    throw new Error("Produto sem titulo para historico de precos.");
  }

  if (!Number.isFinite(price)) {
    throw new Error(`Produto sem preco valido: ${normalizedProduct.productTitle}`);
  }

  if (!product.crawler && !product.store) {
    throw new Error(`Produto sem crawler/loja: ${normalizedProduct.productTitle}`);
  }

  return {
    watchlistId: product.watchlistId || null,
    crawler: product.crawler || product.store,
    productTitle: normalizedProduct.productTitle,
    normalizedTitle: normalizedProduct.normalizedTitle,
    productHash: normalizedProduct.productHash,
    productKey: normalizedProduct.productKey || null,
    canonicalName: normalizedProduct.canonicalName || null,
    price: roundMoney(price),
    oldPrice: Number.isFinite(oldPrice) ? roundMoney(oldPrice) : null,
    availability: product.availability || "unknown",
    url: product.url || product.link || null,
    image: product.image || null
  };
}

function savePrice(product) {
  const historyInput = normalizeHistoryInput(product);
  const duplicate = priceHistoryRepository.findRecentSamePrice(
    historyInput.productHash,
    historyInput.price,
    DUPLICATE_WINDOW_MINUTES
  );

  if (duplicate) {
    return {
      saved: false,
      duplicate: true,
      productHash: historyInput.productHash,
      normalizedTitle: historyInput.normalizedTitle,
      history: duplicate
    };
  }

  const history = priceHistoryRepository.create(historyInput);

  return {
    saved: true,
    duplicate: false,
    productHash: historyInput.productHash,
    normalizedTitle: historyInput.normalizedTitle,
    history
  };
}

function getHistory(productHash) {
  return priceHistoryRepository.getHistory(productHash);
}

function getLowestPrice(productHash) {
  return priceHistoryRepository.getLowestPrice(productHash);
}

function getAveragePrice(productHash) {
  return priceHistoryRepository.getAveragePrice(productHash);
}

function getHighestPrice(productHash) {
  return priceHistoryRepository.getHighestPrice(productHash);
}

function getLastSeen(productHash) {
  return priceHistoryRepository.getLastSeen(productHash);
}

function getProductHistoryReport(productHash) {
  const summary = priceHistoryRepository.getSummary(productHash);

  if (!summary) {
    return null;
  }

  return {
    ...summary,
    history: getHistory(productHash)
  };
}

function listHistoryReports(options = {}) {
  const summaries = priceHistoryRepository.listSummaries(options);

  return summaries.map((summary) => ({
    ...summary,
    history: options.includeHistory ? getHistory(summary.productHash) : []
  }));
}

module.exports = {
  savePrice,
  getHistory,
  getLowestPrice,
  getAveragePrice,
  getHighestPrice,
  getLastSeen,
  getProductHistoryReport,
  listHistoryReports
};
