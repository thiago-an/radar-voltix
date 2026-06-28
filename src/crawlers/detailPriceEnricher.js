const cheerio = require("cheerio");
const { env } = require("../config/env");
const logger = require("../utils/logger");
const { detectBlockedPage, extractPricesFromText } = require("./productExtraction");

function extractDetailPrices(html) {
  const blockedReason = detectBlockedPage(html);
  if (blockedReason) {
    const error = new Error(blockedReason);
    error.code = "BLOCKED";
    throw error;
  }

  const $ = cheerio.load(String(html || ""));
  $("script, style, noscript, svg").remove();
  return extractPricesFromText($("body").text());
}

async function enrichOne(crawler, product, options) {
  if (!product?.link) {
    return product;
  }

  try {
    const response = await crawler.fetchHtml({
      url: product.link,
      timeoutMs: options.timeoutMs || env.crawlerApiTimeoutMs
    });
    const prices = extractDetailPrices(response.html);
    const currentPrice = Number(product.pixPrice || product.cashPrice || product.price);
    const pixPrice = prices.pixPrice;

    if (Number.isFinite(pixPrice) && pixPrice > 0 && (!Number.isFinite(currentPrice) || pixPrice <= currentPrice)) {
      return { ...product, pixPrice };
    }

    return product;
  } catch (error) {
    logger.warn(`${crawler.storeName}: nao foi possivel enriquecer o preco de detalhe.`, {
      link: product.link,
      error: error.message
    });
    return product;
  }
}

async function enrichDetailPrices(crawler, products, options = {}) {
  const source = Array.isArray(products) ? products : [];
  const concurrency = Math.max(1, Number(options.concurrency || 4));
  const enriched = [];

  for (let index = 0; index < source.length; index += concurrency) {
    const batch = source.slice(index, index + concurrency);
    const settled = await Promise.allSettled(batch.map((product) => enrichOne(crawler, product, options)));
    settled.forEach((result, resultIndex) => {
      enriched.push(result.status === "fulfilled" ? result.value : batch[resultIndex]);
    });
  }

  return enriched;
}

module.exports = {
  enrichDetailPrices,
  extractDetailPrices
};
