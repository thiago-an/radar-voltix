function definition(storeName, overrides) {
  return {
    storeName,
    cardSelectors: [],
    titleSelectors: ["h2", "h3", "[class*='title']", "[class*='name']"],
    linkSelectors: ["a[href]", ":scope"],
    imageSelectors: ["img"],
    priceSelectors: ["[class*='price']", "[data-testid*='price']"],
    pixPriceSelectors: ["[class*='pix']", "[data-testid*='pix']"],
    oldPriceSelectors: ["del", "s", "[class*='oldPrice']", "[class*='originalPrice']"],
    blockPatterns: [],
    ...overrides
  };
}

const definitions = {
  kabum: definition("Kabum", {
    cardSelectors: [
      "[data-testid='product-card']",
      "[data-testid*='productCard']",
      "article[class*='product']",
      "[class*='productCard']",
      "a[href*='/produto/']"
    ],
    titleSelectors: [
      "[data-testid='product-title']",
      "[class*='nameCard']",
      "[class*='productName']",
      "h2",
      "h3"
    ],
    linkSelectors: ["a[href*='/produto/']", ":scope"],
    priceSelectors: ["[data-testid='price-value']", "[class*='priceCard']", "[class*='finalPrice']", "[class*='price']"],
    pixPriceSelectors: ["[class*='pix']", "[data-testid*='pix']", "[class*='finalPrice']"]
  }),
  pichau: definition("Pichau", {
    cardSelectors: [
      "[data-cy='product-card']",
      "[data-cy*='product']",
      "article[class*='product']",
      "[class*='ProductCard']",
      "[class*='product-card']"
    ],
    titleSelectors: ["[data-cy='product-name']", "[class*='product-name']", "[class*='title']", "h2", "h3"],
    linkSelectors: ["a[href*='/']"],
    priceSelectors: ["[data-cy='price']", "[class*='price']"],
    pixPriceSelectors: ["[data-cy*='pix']", "[class*='pix']", "[class*='cash']"],
    blockPatterns: [/pigeon/iu, /pombo/iu]
  }),
  terabyte: definition("Terabyte", {
    cardSelectors: [
      "[class*='commerce_columns_item']",
      "[class*='product-item']",
      "[class*='product-card']",
      "[class*='prod-new']",
      "a[href*='/produto/']"
    ],
    titleSelectors: ["[class*='prod-name']", "[class*='product-name']", "[class*='tit']", "h2", "h3"],
    linkSelectors: ["a[href*='/produto/']", ":scope"],
    priceSelectors: ["[class*='prod-new-price']", "[class*='price']", "[class*='valor']"],
    pixPriceSelectors: ["[class*='vista']", "[class*='pix']", "[class*='prod-new-price']"]
  }),
  mercadoLivre: definition("Mercado Livre", {
    cardSelectors: ["li.ui-search-layout__item", ".ui-search-result__wrapper", ".poly-card", "[data-testid='result']"],
    titleSelectors: [".poly-component__title", ".ui-search-item__title", "[class*='title']", "h2", "h3"],
    linkSelectors: ["a.poly-component__title", "a.ui-search-link", "a[href*='mercadolivre.com.br']", "a[href]"],
    priceSelectors: [".andes-money-amount:not(.andes-money-amount--previous)", ".ui-search-price__second-line", "[class*='price']"],
    pixPriceSelectors: ["[class*='pix']"],
    oldPriceSelectors: [".andes-money-amount--previous", "s", "del"]
  }),
  amazon: definition("Amazon", {
    cardSelectors: ["[data-component-type='s-search-result'][data-asin]", ".s-result-item[data-asin]"],
    titleSelectors: ["h2 span", "h2", "[data-cy='title-recipe'] span"],
    linkSelectors: ["h2 a[href]", "a.a-link-normal[href*='/dp/']"],
    imageSelectors: ["img.s-image", "img"],
    priceSelectors: [".a-price:not(.a-text-price) .a-offscreen", ".a-price-whole", "[data-cy='price-recipe'] .a-offscreen"],
    pixPriceSelectors: ["[class*='pix'] .a-offscreen", "[class*='pix']"],
    oldPriceSelectors: [".a-text-price .a-offscreen", "del .a-offscreen"],
    blockPatterns: [/sorry, we just need to make sure/iu, /enter the characters you see below/iu]
  }),
  magalu: definition("Magazine Luiza", {
    cardSelectors: [
      "[data-testid='product-card-container']",
      "[data-testid='product-card-content']",
      "li[data-testid*='product']",
      "[class*='ProductCard']"
    ],
    titleSelectors: ["[data-testid='product-title']", "[data-testid*='title']", "h2", "h3"],
    linkSelectors: ["a[data-testid='product-card-container']", "a[href*='/p/']", "a[href]"],
    priceSelectors: ["[data-testid='price-value']", "[data-testid*='price']", "[class*='price']"],
    pixPriceSelectors: ["[data-testid*='pix']", "[class*='Pix']", "[class*='pix']"]
  }),
  casasBahia: definition("Casas Bahia", {
    cardSelectors: [
      "[data-testid='product-card']",
      "[data-testid*='product-card']",
      "li[class*='ProductCard']",
      "[class*='product-card']"
    ],
    titleSelectors: ["[data-testid*='title']", "[class*='ProductCard'] h2", "h2", "h3"],
    linkSelectors: ["a[href*='/p/']", "a[href]"],
    priceSelectors: ["[data-testid*='price']", "[class*='price']"],
    pixPriceSelectors: ["[data-testid*='pix']", "[class*='pix']"]
  }),
  fastShop: definition("Fast Shop", {
    cardSelectors: [
      "[data-testid*='product-card']",
      "[class*='ProductCard']",
      "[class*='product-card']",
      "li[class*='product']"
    ],
    titleSelectors: ["[data-testid*='title']", "[class*='product-name']", "h2", "h3"],
    linkSelectors: ["a[href*='/p']", "a[href]"],
    priceSelectors: ["[data-testid*='price']", "[class*='price']"],
    pixPriceSelectors: ["[data-testid*='pix']", "[class*='pix']", "[class*='cash']"]
  }),
  googleShopping: definition("Google Shopping", {
    cardSelectors: ["[role='listitem']", ".sh-dgr__content", ".sh-pr__product-results"],
    titleSelectors: ["h3", "[role='heading']"],
    linkSelectors: ["a[href]"],
    priceSelectors: ["[class*='price']", "span"]
  })
};

module.exports = definitions;
