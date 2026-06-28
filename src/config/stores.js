const { env, toBool, toNumber } = require("./env");
const { normalizeText } = require("../utils/text");

function storeConfig(key, name, defaultEnabled = true) {
  return {
    key,
    name,
    enabled: toBool(process.env[`${key.toUpperCase()}_ENABLED`], defaultEnabled),
    timeout: toNumber(process.env[`${key.toUpperCase()}_TIMEOUT_MS`], env.crawlerTimeoutMs)
  };
}

const stores = {
  kabum: storeConfig("kabum", "Kabum", true),
  pichau: storeConfig("pichau", "Pichau", true),
  terabyte: storeConfig("terabyte", "Terabyte", true),
  mercadoLivre: storeConfig("mercado_livre", "Mercado Livre", true),
  amazon: storeConfig("amazon", "Amazon", false),
  magalu: storeConfig("magalu", "Magazine Luiza", false),
  casasBahia: storeConfig("casas_bahia", "Casas Bahia", false),
  fastShop: storeConfig("fastshop", "Fast Shop", false),
  googleShopping: storeConfig("google_shopping", "Google Shopping", false)
};

function normalizeStoreName(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function isStoreAllowed(watchlistItem, storeName) {
  const allowedStores = watchlistItem.allowedStores || [];

  if (!allowedStores.length) {
    return true;
  }

  const selected = normalizeStoreName(storeName);
  return allowedStores.some((allowedStore) => normalizeStoreName(allowedStore) === selected);
}

module.exports = {
  stores,
  isStoreAllowed,
  normalizeStoreName
};
