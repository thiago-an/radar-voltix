const { env, toBool, toNumber } = require("./env");

function sourceConfig(key, name, defaultEnabled) {
  const envKey = key.toUpperCase();
  return {
    key,
    name,
    enabled: toBool(process.env[`${envKey}_SOURCE_ENABLED`], defaultEnabled),
    timeout: toNumber(process.env[`${envKey}_SOURCE_TIMEOUT_MS`], env.crawlerTimeoutMs)
  };
}

const dealSources = {
  pelando: sourceConfig("pelando", "Pelando", true),
  promobit: sourceConfig("promobit", "Promobit", true),
  googleShopping: sourceConfig("google_shopping", "Google Shopping", false)
};

module.exports = {
  dealSources
};
