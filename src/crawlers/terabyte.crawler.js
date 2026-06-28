const BaseCrawler = require("./baseCrawler");
const { stores } = require("../config/stores");
const searchUrlBuilders = require("./searchUrlBuilders");
const definitions = require("./storeDefinitions");
const searchStorefront = require("./storefrontSearch");

class TerabyteCrawler extends BaseCrawler {
  constructor() {
    super({ storeName: stores.terabyte.name, enabled: stores.terabyte.enabled, timeout: stores.terabyte.timeout });
  }

  buildSearchUrl(query) {
    return searchUrlBuilders.terabyte(query);
  }

  async performSearch(query) {
    return searchStorefront(this, query, {
      url: this.buildSearchUrl(query),
      definition: definitions.terabyte
    });
  }
}

module.exports = new TerabyteCrawler();
