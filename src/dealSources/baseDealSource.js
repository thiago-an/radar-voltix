const BaseCrawler = require("../crawlers/baseCrawler");
const { env } = require("../config/env");

class BaseDealSource extends BaseCrawler {
  constructor(options = {}) {
    super({
      ...options,
      storeName: `Deal Source: ${options.sourceName}`,
      maxResults: options.maxResults || env.maxProductsPerDealSource
    });
    this.sourceName = options.sourceName;
  }

  normalizeProduct(rawProduct) {
    const raw = rawProduct?.raw && typeof rawProduct.raw === "object"
      ? { ...rawProduct.raw, source: rawProduct.source || this.sourceName }
      : rawProduct?.raw;
    const normalized = super.normalizeProduct({
      ...rawProduct,
      store: rawProduct?.store || this.sourceName,
      raw
    });

    if (!normalized) {
      return null;
    }

    return {
      title: normalized.title,
      price: normalized.price,
      oldPrice: normalized.oldPrice,
      link: normalized.link,
      image: normalized.image,
      store: normalized.store,
      source: rawProduct.source || this.sourceName,
      availability: normalized.availability,
      raw: normalized.raw
    };
  }
}

module.exports = BaseDealSource;
