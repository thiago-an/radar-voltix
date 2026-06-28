function definition(storeName, overrides) {
  return {
    storeName,
    cardSelectors: [],
    titleSelectors: ["h2", "h3", "[class*='title']"],
    linkSelectors: ["a[href]", ":scope"],
    imageSelectors: ["img"],
    priceSelectors: ["[class*='price']", "[data-testid*='price']"],
    pixPriceSelectors: ["[class*='pix']"],
    oldPriceSelectors: ["del", "s", "[class*='old']"],
    blockPatterns: [],
    ...overrides
  };
}

module.exports = {
  pelando: definition("Pelando", {
    cardSelectors: [
      "article",
      "[data-testid*='deal']",
      "[class*='DealCard']",
      "[class*='deal-card']",
      "a[href*='/d/']"
    ],
    titleSelectors: ["[data-testid*='title']", "[class*='title']", "h2", "h3"],
    linkSelectors: ["a[href*='/d/']", ":scope"],
    priceSelectors: ["[data-testid*='price']", "[class*='price']", "strong"],
    blockPatterns: [/checking your browser/i]
  }),
  promobit: definition("Promobit", {
    cardSelectors: [
      "article",
      "[data-testid*='offer']",
      "[class*='OfferCard']",
      "[class*='offer-card']",
      "a[href*='/oferta/']"
    ],
    titleSelectors: ["[data-testid*='title']", "[class*='title']", "h2", "h3"],
    linkSelectors: ["a[href*='/oferta/']", ":scope"],
    priceSelectors: ["[data-testid*='price']", "[class*='price']", "strong"],
    blockPatterns: [/checking your browser/i]
  }),
  googleShopping: definition("Google Shopping", {
    cardSelectors: [".sh-dgr__content", "[role='listitem']", ".sh-pr__product-results", ".i0X6df"],
    titleSelectors: ["h3", "[role='heading']", ".tAxDx"],
    linkSelectors: ["a[href]"],
    priceSelectors: [".a8Pemb", "[class*='price']", "span"],
    blockPatterns: [/unusual traffic/i, /detected unusual traffic/i]
  })
};
