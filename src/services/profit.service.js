const { defaultMarketplace, getMarketplace } = require("../config/marketplaces");
const profitRepository = require("../repositories/profit.repository");
const { roundMoney } = require("../utils/money");

const MINIMUM_ROI = 20;
const MINIMUM_NET_PROFIT = 30;

function requirePositive(value, field) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    const error = new Error(`${field} deve ser maior que zero.`);
    error.statusCode = 400;
    throw error;
  }
  return parsed;
}

function requireNonNegative(value, field) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) {
    const error = new Error(`${field} deve ser maior ou igual a zero.`);
    error.statusCode = 400;
    throw error;
  }
  return parsed;
}

function calculateProfit(input = {}) {
  const purchasePrice = requirePositive(input.purchasePrice, "purchasePrice");
  const sellPrice = requirePositive(input.sellPrice, "sellPrice");
  const marketplace = getMarketplace(input.marketplace || defaultMarketplace);

  if (!marketplace) {
    const error = new Error(`Marketplace nao suportado: ${input.marketplace || "nao informado"}.`);
    error.statusCode = 400;
    throw error;
  }

  const shippingCost = input.shippingCost === undefined || input.shippingCost === null || input.shippingCost === ""
    ? requireNonNegative(marketplace.averageShipping, "shippingCost")
    : requireNonNegative(input.shippingCost, "shippingCost");
  const packagingCost = requireNonNegative(input.packagingCost, "packagingCost");
  const fixedFee = marketplace.fixedFeeMaxSellPrice > 0 && sellPrice >= marketplace.fixedFeeMaxSellPrice
    ? 0
    : requireNonNegative(marketplace.fixedFee, "fixedFee");
  const percentageFee = roundMoney(sellPrice * (requireNonNegative(marketplace.percentageFee, "percentageFee") / 100));
  const totalFees = roundMoney(
    fixedFee
      + percentageFee
      + requireNonNegative(marketplace.adCost, "adCost")
      + requireNonNegative(marketplace.processingCost, "processingCost")
      + shippingCost
      + packagingCost
  );
  const grossProfit = roundMoney(sellPrice - purchasePrice);
  const netProfit = roundMoney(grossProfit - totalFees);
  const roi = roundMoney((netProfit / purchasePrice) * 100);

  return {
    grossProfit,
    netProfit,
    roi,
    totalFees,
    recommended: roi >= MINIMUM_ROI && netProfit >= MINIMUM_NET_PROFIT
  };
}

function startOfLocalDayIso(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

function listTopProfitsToday(limit = 10, options = {}) {
  const marketplaceKey = options.marketplace || defaultMarketplace;
  const rows = profitRepository.listHistorySince(startOfLocalDayIso(options.now));
  const latestByProduct = new Map();

  for (const row of rows) {
    if (!latestByProduct.has(row.productHash)) {
      latestByProduct.set(row.productHash, row);
    }
  }

  return [...latestByProduct.values()]
    .map((row) => {
      const profit = calculateProfit({
        purchasePrice: row.purchasePrice,
        sellPrice: row.sellPrice,
        marketplace: marketplaceKey
      });

      return {
        ...row,
        marketplace: getMarketplace(marketplaceKey).name,
        ...profit
      };
    })
    .sort((first, second) => second.netProfit - first.netProfit)
    .slice(0, Math.max(1, Math.min(Number(limit) || 10, 50)));
}

module.exports = {
  MINIMUM_ROI,
  MINIMUM_NET_PROFIT,
  calculateProfit,
  listTopProfitsToday,
  startOfLocalDayIso
};
