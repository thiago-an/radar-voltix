const priceIntelligenceService = require("./priceIntelligence.service");

function calculateRankingScore(opportunity) {
  const baseScore = Number(opportunity.score || 0);
  const netProfit = Number(opportunity.netProfit || opportunity.profit?.netProfit || 0);
  const roi = Number(opportunity.roi || opportunity.profit?.roi || 0);
  const price = Number(opportunity.price || opportunity.product?.price || 0);
  const priority = Number(opportunity.watchlistItem?.priority || opportunity.priority || 1);
  const priceIntel = opportunity.priceIntelligence || {};

  let score = baseScore;

  if (netProfit >= 100) score += 20;
  else if (netProfit >= 50) score += 12;
  else if (netProfit >= 30) score += 8;

  if (roi >= 40) score += 15;
  else if (roi >= 30) score += 10;
  else if (roi >= 20) score += 5;

  score += priority * 3;
  score += Number(priceIntel.scoreBonus || 0);

  if (price > 0 && price <= 100) score += 5;

  if (netProfit >= 100 && roi >= 40 && priceIntel.level === "historic_low") {
  score = 100;
}

  return Math.min(Math.max(Math.round(score), 0), 99);
}

function buildDailyRanking(opportunities = [], limit = 5) {
  return opportunities
    .map((opportunity) => {
      const priceIntelligence =
        opportunity.priceIntelligence ||
        priceIntelligenceService.analyzeProduct(opportunity.product || opportunity);

      return {
        ...opportunity,
        priceIntelligence,
        rankingScore: calculateRankingScore({
          ...opportunity,
          priceIntelligence
        })
      };
    })
    .sort((a, b) => {
      const scoreDiff = b.rankingScore - a.rankingScore;
      if (scoreDiff !== 0) return scoreDiff;

      const profitA = Number(a.netProfit || a.profit?.netProfit || 0);
      const profitB = Number(b.netProfit || b.profit?.netProfit || 0);

      return profitB - profitA;
    })
    .slice(0, limit);
}

function formatMoney(value) {
  const number = Number(value || 0);

  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function getOpportunityValue(opportunity, key, fallback = 0) {
  return (
    opportunity[key] ??
    opportunity.product?.[key] ??
    opportunity.profit?.[key] ??
    fallback
  );
}

function formatDailyRankingMessage(ranking = []) {
  if (!ranking.length) {
    return "📊 Radar Voltix executado, mas nenhuma oportunidade entrou no Top Ranking.";
  }

  const lines = [];

  lines.push("🏆 *TOP OPORTUNIDADES VOLTIX*");
  lines.push("");
  lines.push(`Foram selecionadas as ${ranking.length} melhores oportunidades da execução.`);
  lines.push("");

  ranking.forEach((item, index) => {
    const title = item.title || item.product?.title || item.name || "Produto sem nome";
    const store = item.store || item.product?.store || "Loja não informada";
    const price = getOpportunityValue(item, "price");
    const sellPrice = item.expectedSellPrice || item.watchlistItem?.expectedSellPrice || item.sellPrice;
    const netProfit = item.netProfit || item.profit?.netProfit;
    const roi = item.roi || item.profit?.roi;
    const link = item.link || item.product?.link;

    lines.push(`${index + 1}️⃣ *${title}*`);
    lines.push(`🏪 Loja: ${store}`);
    lines.push(`💰 Compra: ${formatMoney(price)}`);

    if (sellPrice) {
      lines.push(`📈 Venda estimada: ${formatMoney(sellPrice)}`);
    }

    if (netProfit) {
      lines.push(`💵 Lucro líquido: ${formatMoney(netProfit)}`);
    }

    if (roi) {
      lines.push(`🔥 ROI: ${Number(roi).toFixed(1)}%`);
    }

    lines.push(`⭐ Score: ${item.rankingScore}/100`);

    if (item.priceIntelligence) {
      lines.push(`📊 Preço: ${item.priceIntelligence.label}`);
      lines.push(`📉 Tendência: ${item.priceIntelligence.trendLabel}`);

      if (item.priceIntelligence.averagePrice) {
        lines.push(`📌 Média histórica: ${formatMoney(item.priceIntelligence.averagePrice)}`);
      }

      if (item.priceIntelligence.lowestPrice) {
        lines.push(`🏷️ Menor registrado: ${formatMoney(item.priceIntelligence.lowestPrice)}`);
      }
    }

    if (link) {
      lines.push(`🔗 ${link}`);
    }

    lines.push("");
    lines.push("━━━━━━━━━━━━━━");
    lines.push("");
  });

  lines.push("⚠️ Conferir frete, estoque e preço final antes de comprar.");

  return lines.join("\n");
}

module.exports = {
  buildDailyRanking,
  formatDailyRankingMessage,
  calculateRankingScore
};