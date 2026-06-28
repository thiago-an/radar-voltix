const BaseCrawler = require("./baseCrawler");
const { stores } = require("../config/stores");
const searchUrlBuilders = require("./searchUrlBuilders");
const definitions = require("./storeDefinitions");
const searchStorefront = require("./storefrontSearch");

class AmazonCrawler extends BaseCrawler {
  constructor() {
    super({ storeName: stores.amazon.name, enabled: stores.amazon.enabled, timeout: stores.amazon.timeout });
  }

  buildSearchUrl(query) {
    return searchUrlBuilders.amazon(query);
  }

  async performSearch(query) {
    return searchStorefront(this, query, {
      url: this.buildSearchUrl(query),
      definition: definitions.amazon,
      waitMs: 1600
    });
  }
}

module.exports = new AmazonCrawler();
