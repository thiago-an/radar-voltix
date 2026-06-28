const BaseCrawler = require("./baseCrawler");
const { stores } = require("../config/stores");
const searchUrlBuilders = require("./searchUrlBuilders");
const definitions = require("./storeDefinitions");
const searchStorefront = require("./storefrontSearch");

class MagaluCrawler extends BaseCrawler {
  constructor() {
    super({ storeName: stores.magalu.name, enabled: stores.magalu.enabled, timeout: stores.magalu.timeout });
  }

  buildSearchUrl(query) {
    return searchUrlBuilders.magalu(query);
  }

  async performSearch(query) {
    return searchStorefront(this, query, {
      url: this.buildSearchUrl(query),
      definition: definitions.magalu
    });
  }
}

module.exports = new MagaluCrawler();
