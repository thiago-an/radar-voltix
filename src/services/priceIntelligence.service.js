const historyService = require("./history.service");
const priceAnalytics = require("./priceAnalytics.service");

function average(values) {
  const valid = values.filter((value) => Number.isFinite(Number(value)));

  if (!valid.length) return null;

  return valid.reduce((sum, value) => sum + Number(value), 0) / valid.length;
}

function getPriceLevel({ currentPrice, lowestPrice, averagePrice }) {
  if (!currentPrice || !lowestPrice || !averagePrice) {
    return {
      level: "unknown",
      label: "Sem histórico suficiente",
      scoreBonus: 0
    };
  }

  const aboveLowestPercent = ((currentPrice - lowestPrice) / lowestPrice) * 100;
  const belowAveragePercent = ((averagePrice - currentPrice) / averagePrice) * 100;

  if (currentPrice <= lowestPrice) {
    return {
      level: "historic_low",
      label: "🔥 Oferta histórica",
      scoreBonus: 20
    };
  }

  if (aboveLowestPercent <= 10) {
    return {
      level: "excellent",
      label: "🟢 Excelente preço",
      scoreBonus: 15
    };
  }

  if (belowAveragePercent >= 15) {
    return {
      level: "good",
      label: "🟡 Bom preço",
      scoreBonus: 10
    };
  }

  if (currentPrice > averagePrice) {
    return {
      level: "expensive",
      label: "🔴 Acima da média",
      scoreBonus: -10
    };
  }

  return {
    level: "normal",
    label: "Preço normal",
    scoreBonus: 0
  };
}

function getTrend(history) {
  if (!history || history.length < 3) {
    return {
      trend: "unknown",
      label: "Sem tendência suficiente"
    };
  }

  const ordered = [...history].sort(
    (a, b) =>
      new Date(a.captured_at || a.capturedAt) -
      new Date(b.captured_at || b.capturedAt)
  );

  const recent = ordered.slice(-3).map((item) => Number(item.price));
  const first = recent[0];
  const last = recent[recent.length - 1];

  if (!Number.isFinite(first) || !Number.isFinite(last)) {
    return {
      trend: "unknown",
      label: "Sem tendência suficiente"
    };
  }

  const changePercent = ((last - first) / first) * 100;

  if (changePercent <= -5) {
    return {
      trend: "falling",
      label: "⬇️ Caindo"
    };
  }

  if (changePercent >= 5) {
    return {
      trend: "rising",
      label: "⬆️ Subindo"
    };
  }

  return {
    trend: "stable",
    label: "➡️ Estável"
  };
}

function analyzeProduct(product) {
  const productHash =
    product.productHash ||
    product.product_hash ||
    product.hash ||
    product.normalizedTitle ||
    product.normalized_title;

  if (!productHash) {
    return {
      level: "unknown",
      label: "Sem histórico suficiente",
      scoreBonus: 0,
      trend: "unknown",
      trendLabel: "Sem tendência suficiente",
      lowestPrice: null,
      highestPrice: null,
      averagePrice: null,
      discountVsAverage: null,
      records: 0
    };
  }

  const history = historyService.getHistory(productHash) || [];
  const analytics = priceAnalytics.analyzeHistory(history);
  const prices = history.map((item) => Number(item.price)).filter(Number.isFinite);

  const lowestPrice = analytics.lowestPrice;
  const highestPrice = analytics.highestPrice;
  const averagePrice = analytics.averagePrice;
  const currentPrice = Number(product.price);

  const level = getPriceLevel({
    currentPrice,
    lowestPrice,
    averagePrice
  });

  const trend = getTrend(history);

  const discountVsAverage =
    averagePrice && currentPrice
      ? ((averagePrice - currentPrice) / averagePrice) * 100
      : null;

  return {
    ...level,
    trend: trend.trend,
    trendLabel: trend.label,
    currentPrice,
    lowestPrice,
    highestPrice,
    averagePrice,
    discountVsAverage,
    records: prices.length,
    analytics,
    volatility: analytics.volatility,
    monitoredDays: analytics.monitoredDays,
    distanceFromLowest: analytics.distanceFromLowest,
    trendChangePercent: analytics.trendChangePercent,
  };
}

module.exports = {
  analyzeProduct,
  getPriceLevel,
  getTrend
};