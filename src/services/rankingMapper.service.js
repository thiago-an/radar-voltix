function toRankingCandidate({
  product,
  watchlistItem,
  opportunity,
  profit,
  marketplace,
  inventory,
  marketplaceComparison,
  duplicateHash
}) {
  return {
    product,
    watchlistItem,
    opportunity,
    profit,
    marketplace,
    inventory,
    marketplaceComparison,
    duplicateHash,

    title: product.title,
    store: product.store,
    price: product.price,
    link: product.link,
    score: opportunity.score,
    recommendation: opportunity.recommendation,
    expectedSellPrice: watchlistItem.expectedSellPrice,
    netProfit: profit.netProfit,
    roi: profit.roi,
    priority: watchlistItem.priority
  };
}

function toPersistedRankingItem(item) {
  return {
    title: item.product?.title || item.title,
    store: item.product?.store || item.store,
    price: item.product?.price || item.price,
    link: item.product?.link || item.link,
    score: item.rankingScore,
    netProfit: item.profit?.netProfit || item.netProfit,
    roi: item.profit?.roi || item.roi,
    recommendation: item.opportunity?.recommendation || item.recommendation,
    priceIntelligence: item.priceIntelligence
  };
}

module.exports = {
  toRankingCandidate,
  toPersistedRankingItem
};