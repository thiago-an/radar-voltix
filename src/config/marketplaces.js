const { toNumber } = require("./env");
const { normalizeText } = require("../utils/text");

function marketplaceConfig(key, name, defaults) {
  const prefix = `MARKETPLACE_${key.toUpperCase()}`;
  return {
    key,
    name,
    fixedFee: toNumber(process.env[`${prefix}_FIXED_FEE`], defaults.fixedFee),
    fixedFeeMaxSellPrice: toNumber(
      process.env[`${prefix}_FIXED_FEE_MAX_SELL_PRICE`],
      defaults.fixedFeeMaxSellPrice ?? 0
    ),
    percentageFee: toNumber(process.env[`${prefix}_PERCENTAGE_FEE`], defaults.percentageFee),
    adCost: toNumber(process.env[`${prefix}_AD_COST`], defaults.adCost),
    processingCost: toNumber(process.env[`${prefix}_PROCESSING_COST`], defaults.processingCost),
    averageShipping: toNumber(process.env[`${prefix}_AVERAGE_SHIPPING`], defaults.averageShipping),
    updatedAt: defaults.updatedAt,
    notes: defaults.notes
  };
}

const marketplaces = {
  mercadolivre: marketplaceConfig("mercadolivre", "Mercado Livre", {
    fixedFee: 6.75,
    fixedFeeMaxSellPrice: 79,
    percentageFee: 14,
    adCost: 0,
    processingCost: 0,
    averageShipping: 20,
    updatedAt: "2026-06-27",
    notes: "Estimativa conservadora para anuncio Classico; a tarifa percentual varia por categoria."
  }),
  shopee: marketplaceConfig("shopee", "Shopee", {
    fixedFee: 4,
    percentageFee: 20,
    adCost: 0,
    processingCost: 0,
    averageShipping: 18,
    updatedAt: "2026-06-27",
    notes: "Estimativa configuravel; programas promocionais e perfil do vendedor podem alterar as taxas."
  }),
  tiktokshop: marketplaceConfig("tiktokshop", "TikTok Shop", {
    fixedFee: 6,
    percentageFee: 6,
    adCost: 0,
    processingCost: 0,
    averageShipping: 15,
    updatedAt: "2026-06-27",
    notes: "Estimativa conservadora para itens de R$ 50 ou mais considerando a tabela anunciada para julho de 2026."
  }),
  facebook: marketplaceConfig("facebook", "Facebook Marketplace", {
    fixedFee: 0,
    percentageFee: 0,
    adCost: 0,
    processingCost: 0,
    averageShipping: 0,
    updatedAt: "2026-06-27",
    notes: "Estimativa para venda local com retirada e pagamento combinados entre comprador e vendedor; impulsionamento e frete nao incluidos."
  })
};

const aliases = new Map([
  ["mercadolivre", "mercadolivre"],
  ["mercadolivrebr", "mercadolivre"],
  ["ml", "mercadolivre"],
  ["shopee", "shopee"],
  ["tiktok", "tiktokshop"],
  ["tiktokshop", "tiktokshop"],
  ["facebook", "facebook"],
  ["facebookbr", "facebook"],
  ["facebookmarketplace", "facebook"],
  ["fb", "facebook"]
]);

function normalizeMarketplaceKey(value) {
  const normalized = normalizeText(value).replace(/[^a-z0-9]/g, "");
  return aliases.get(normalized) || normalized;
}

function getMarketplace(value) {
  return marketplaces[normalizeMarketplaceKey(value)] || null;
}

function listMarketplaces() {
  return Object.values(marketplaces);
}

const defaultMarketplace = normalizeMarketplaceKey(process.env.DEFAULT_MARKETPLACE || "mercadolivre");

module.exports = {
  marketplaces,
  defaultMarketplace,
  normalizeMarketplaceKey,
  getMarketplace,
  listMarketplaces
};
