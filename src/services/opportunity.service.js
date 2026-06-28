const { roundMoney } = require("../utils/money");

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getRecommendation(score) {
  if (score >= 90) {
    return "COMPRAR AGORA";
  }

  if (score >= 70) {
    return "BOA OPORTUNIDADE";
  }

  if (score >= 50) {
    return "ANALISAR";
  }

  return "IGNORAR";
}

function calculateOpportunity(product, watchlistItem) {
  const buyPrice = Number(product.price || 0);
  const expectedSellPrice = Number(watchlistItem.expectedSellPrice || 0);
  const maxBuyPrice = Number(watchlistItem.maxBuyPrice || 0);
  const minMarginPercent = Number(watchlistItem.minMarginPercent || 0);
  const priority = Number(watchlistItem.priority || 1);

  const grossProfit = roundMoney(expectedSellPrice - buyPrice);
  const marginPercent = buyPrice > 0 ? roundMoney((grossProfit / buyPrice) * 100) : 0;
  const isBelowMaxBuyPrice = maxBuyPrice > 0 && buyPrice <= maxBuyPrice;
  const hitsMinimumMargin = marginPercent >= minMarginPercent;

  const maxPriceScore = isBelowMaxBuyPrice ? 35 : 0;
  const marginScore = minMarginPercent > 0 ? clamp((marginPercent / minMarginPercent) * 30, 0, 30) : 20;
  const discountScore = maxBuyPrice > 0 ? clamp(((maxBuyPrice - buyPrice) / maxBuyPrice) * 20, 0, 20) : 0;
  const profitScore = expectedSellPrice > 0 ? clamp((grossProfit / expectedSellPrice) * 10, 0, 10) : 0;
  const priorityScore = clamp(priority, 1, 5);

  let score = Math.round(maxPriceScore + marginScore + discountScore + profitScore + priorityScore);

  if (!isBelowMaxBuyPrice || !hitsMinimumMargin || grossProfit <= 0) {
    score = Math.min(score, 49);
  }

  score = clamp(score, 0, 100);

  return {
    buyPrice: roundMoney(buyPrice),
    expectedSellPrice: roundMoney(expectedSellPrice),
    grossProfit,
    marginPercent,
    isBelowMaxBuyPrice,
    hitsMinimumMargin,
    score,
    recommendation: getRecommendation(score)
  };
}

module.exports = {
  calculateOpportunity,
  getRecommendation
};
