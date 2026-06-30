function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function average(values) {
  const valid = values.map(toNumber).filter((value) => value !== null);

  if (!valid.length) return null;

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function calculateTrend(prices) {
  if (!prices || prices.length < 3) {
    return {
      trend: "unknown",
      label: "Sem tendência suficiente",
      changePercent: null
    };
  }

  const first = toNumber(prices[0]);
  const last = toNumber(prices[prices.length - 1]);

  if (!first || !last) {
    return {
      trend: "unknown",
      label: "Sem tendência suficiente",
      changePercent: null
    };
  }

  const changePercent = ((last - first) / first) * 100;

  if (changePercent <= -5) {
    return {
      trend: "falling",
      label: "⬇️ Caindo",
      changePercent
    };
  }

  if (changePercent >= 5) {
    return {
      trend: "rising",
      label: "⬆️ Subindo",
      changePercent
    };
  }

  return {
    trend: "stable",
    label: "➡️ Estável",
    changePercent
  };
}

function analyzeHistory(history = []) {
  const ordered = [...history].sort(
    (a, b) =>
      new Date(a.capturedAt || a.captured_at || 0) -
      new Date(b.capturedAt || b.captured_at || 0)
  );

  const prices = ordered
    .map((item) => toNumber(item.price))
    .filter((value) => value !== null);

  if (!prices.length) {
    return {
      records: 0,
      currentPrice: null,
      lowestPrice: null,
      highestPrice: null,
      averagePrice: null,
      discountVsAverage: null,
      distanceFromLowest: null,
      volatility: null,
      monitoredDays: 0,
      trend: "unknown",
      trendLabel: "Sem histórico suficiente",
      trendChangePercent: null
    };
  }

  const currentPrice = prices[prices.length - 1];
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const averagePrice = average(prices);

  const discountVsAverage =
    averagePrice && currentPrice
      ? ((averagePrice - currentPrice) / averagePrice) * 100
      : null;

  const distanceFromLowest =
    lowestPrice && currentPrice
      ? ((currentPrice - lowestPrice) / lowestPrice) * 100
      : null;

  const volatility =
    averagePrice && highestPrice && lowestPrice
      ? ((highestPrice - lowestPrice) / averagePrice) * 100
      : null;

  const firstDate = ordered[0]?.capturedAt || ordered[0]?.captured_at;
  const lastDate = ordered[ordered.length - 1]?.capturedAt || ordered[ordered.length - 1]?.captured_at;

  const monitoredDays =
    firstDate && lastDate
      ? Math.max(1, Math.ceil((new Date(lastDate) - new Date(firstDate)) / 86400000))
      : 1;

  const trend = calculateTrend(prices.slice(-5));

  return {
    records: prices.length,
    currentPrice,
    lowestPrice,
    highestPrice,
    averagePrice,
    discountVsAverage,
    distanceFromLowest,
    volatility,
    monitoredDays,
    trend: trend.trend,
    trendLabel: trend.label,
    trendChangePercent: trend.changePercent
  };
}

module.exports = {
  analyzeHistory,
  calculateTrend
};