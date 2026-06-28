const BaseCrawler = require("./baseCrawler");
const { stores } = require("../config/stores");
const searchUrlBuilders = require("./searchUrlBuilders");
const definitions = require("./storeDefinitions");
const searchStorefront = require("./storefrontSearch");

class GoogleShoppingCrawler extends BaseCrawler {
  constructor() {
    super({
      storeName: stores.googleShopping.name,
      enabled: stores.googleShopping.enabled,
      timeout: stores.googleShopping.timeout
    });
  }

  buildSearchUrl(query) {
    return searchUrlBuilders.googleShopping(query);
  }

  async performSearch(query) {
    return searchStorefront(this, query, {
      url: this.buildSearchUrl(query),
      definition: definitions.googleShopping
    });
  }
}

module.exports = new GoogleShoppingCrawler();
