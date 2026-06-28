const { formatBRL } = require("../utils/money");
const whatsappService = require("./whatsapp.service");

function buildOpportunityMessage(product, watchlistItem, opportunity, profit, marketplace, inventory, marketplaceComparison) {
  const selectedProfit = profit || {
    grossProfit: opportunity.grossProfit,
    totalFees: 0,
    netProfit: opportunity.grossProfit,
    roi: opportunity.marginPercent
  };
  const selectedMarketplace = marketplace || { name: "Nao informado" };
  const bestMarketplace = marketplaceComparison?.[0]?.marketplace || selectedMarketplace.name;
  const selectedInventory = inventory || { quantity: 0, reorderRecommended: true };
  const inventoryMessage = `Você já tem ${selectedInventory.quantity} unidades em estoque.`;
  const reorderMessage = selectedInventory.quantity <= 2 || selectedInventory.reorderRecommended
    ? "\n⚡ *Hora de repor estoque.*"
    : "";

  return `🚨 *RADAR VOLTIX*

🏪 *Loja:* ${product.store}
🛒 *Produto:* ${product.title}
💰 *Compra:* ${formatBRL(opportunity.buyPrice)}
📈 *Venda estimada:* ${formatBRL(opportunity.expectedSellPrice)}
💵 *Lucro bruto:* ${formatBRL(selectedProfit.grossProfit)}
🧾 *Taxas e custos:* ${formatBRL(selectedProfit.totalFees)}
✅ *Lucro líquido:* ${formatBRL(selectedProfit.netProfit)}
🔥 *ROI líquido:* ${selectedProfit.roi}%
🏷️ *Marketplace:* ${selectedMarketplace.name}
🎯 *Melhor lugar para vender:* ${bestMarketplace}
📦 *Estoque:* ${inventoryMessage}${reorderMessage}
⭐ *Score:* ${opportunity.score}/100

✅ *Recomendação:* ${opportunity.recommendation}

🔗 *Link:*
${product.link || "Link nao informado"}

⚠️ Conferir frete, reputação, estoque e preço final antes de comprar.`;
}

async function notifyOpportunity(product, watchlistItem, opportunity, profit, marketplace, inventory, marketplaceComparison) {
  const message = buildOpportunityMessage(
    product,
    watchlistItem,
    opportunity,
    profit,
    marketplace,
    inventory,
    marketplaceComparison
  );
  return whatsappService.sendMessage(message);
}

module.exports = {
  buildOpportunityMessage,
  notifyOpportunity
};
