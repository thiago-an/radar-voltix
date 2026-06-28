const BaseCrawler = require("./baseCrawler");
const { stores } = require("../config/stores");
const searchUrlBuilders = require("./searchUrlBuilders");
const definitions = require("./storeDefinitions");
const searchStorefront = require("./storefrontSearch");

class CasasBahiaCrawler extends BaseCrawler {
  constructor() {
    super({
      storeName: stores.casasBahia.name,
      enabled: stores.casasBahia.enabled,
      timeout: stores.casasBahia.timeout
    });
  }

  buildSearchUrl(query) {
    return searchUrlBuilders.casasBahia(query);
  }

  async performSearch(query) {
    return searchStorefront(this, query, {
      url: this.buildSearchUrl(query),
      definition: definitions.casasBahia
    });
  }
}

module.exports = new CasasBahiaCrawler();
