const { listMarketplaces } = require("../config/marketplaces");
const alertRepository = require("../repositories/alert.repository");
const priceHistoryRepository = require("../repositories/priceHistory.repository");
const productRepository = require("../repositories/product.repository");
const watchlistRepository = require("../repositories/watchlist.repository");
const profitService = require("./profit.service");
const { normalizeTitle } = require("./productNormalizer");

function compareMarketplaces(product = {}) {
  const purchasePrice = product.purchasePrice ?? product.buyPrice ?? product.price;
  const sellPrice = product.sellPrice ?? product.expectedSellPrice ?? product.expected_sell_price;

  return listMarketplaces()
    .map((marketplace) => ({
      marketplace: marketplace.name,
      marketplaceKey: marketplace.key,
      notes: marketplace.notes,
      ...profitService.calculateProfit({
        purchasePrice,
        sellPrice,
        marketplace: marketplace.key,
        packagingCost: product.packagingCost
      })
    }))
    .sort((first, second) => (
      second.netProfit - first.netProfit
      || second.roi - first.roi
      || first.marketplace.localeCompare(second.marketplace, "pt-BR")
    ))
    .map((result, index) => ({
      ...result,
      ranking: index + 1
    }));
}

function requireProductId(value) {
  const productId = Number(value);
  if (!Number.isInteger(productId) || productId <= 0) {
    const error = new Error("productId deve ser um inteiro positivo.");
    error.statusCode = 400;
    throw error;
  }
  return productId;
}

function findWatchlistContext(product) {
  const latestAlert = alertRepository.findLatestByProductId(product.id);
  if (latestAlert?.watchlistId) {
    const watchlistItem = watchlistRepository.findById(latestAlert.watchlistId);
    if (watchlistItem) return watchlistItem;
  }

  const history = priceHistoryRepository.findLatestByNormalizedTitle(normalizeTitle(product.title));
  return history?.watchlistId ? watchlistRepository.findById(history.watchlistId) : null;
}

function compareProductById(value) {
  const productId = requireProductId(value);
  const product = productRepository.findById(productId);

  if (!product) {
    const error = new Error("Produto nao encontrado.");
    error.statusCode = 404;
    throw error;
  }

  const watchlistItem = findWatchlistContext(product);
  const expectedSellPrice = product.expectedSellPrice
    ?? product.raw?.expectedSellPrice
    ?? watchlistItem?.expectedSellPrice;

  if (!Number.isFinite(Number(expectedSellPrice)) || Number(expectedSellPrice) <= 0) {
    const error = new Error("Produto sem preco esperado de venda associado na watchlist.");
    error.statusCode = 422;
    throw error;
  }

  return compareMarketplaces({
    ...product,
    expectedSellPrice,
    packagingCost: watchlistItem?.packagingCost
  });
}

module.exports = {
  compareMarketplaces,
  compareProductById
};
