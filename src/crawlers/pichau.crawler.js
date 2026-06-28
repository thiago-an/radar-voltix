const BaseCrawler = require("./baseCrawler");
const { stores } = require("../config/stores");
const searchUrlBuilders = require("./searchUrlBuilders");
const definitions = require("./storeDefinitions");
const searchStorefront = require("./storefrontSearch");

class PichauCrawler extends BaseCrawler {
  constructor() {
    super({ storeName: stores.pichau.name, enabled: stores.pichau.enabled, timeout: stores.pichau.timeout });
  }

  buildSearchUrl(query) {
    return searchUrlBuilders.pichau(query);
  }

  async performSearch(query) {
    return searchStorefront(this, query, {
      url: this.buildSearchUrl(query),
      definition: definitions.pichau
    });
  }
}

module.exports = new PichauCrawler();
