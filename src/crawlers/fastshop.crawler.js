const BaseCrawler = require("./baseCrawler");
const { stores } = require("../config/stores");
const searchUrlBuilders = require("./searchUrlBuilders");
const definitions = require("./storeDefinitions");
const searchStorefront = require("./storefrontSearch");

class FastShopCrawler extends BaseCrawler {
  constructor() {
    super({ storeName: stores.fastShop.name, enabled: stores.fastShop.enabled, timeout: stores.fastShop.timeout });
  }

  buildSearchUrl(query) {
    return searchUrlBuilders.fastShop(query);
  }

  async performSearch(query) {
    return searchStorefront(this, query, {
      url: this.buildSearchUrl(query),
      definition: definitions.fastShop
    });
  }
}

module.exports = new FastShopCrawler();
