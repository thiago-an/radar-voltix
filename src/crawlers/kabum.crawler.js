const BaseCrawler = require("./baseCrawler");
const { stores } = require("../config/stores");
const searchUrlBuilders = require("./searchUrlBuilders");
const definitions = require("./storeDefinitions");
const searchStorefront = require("./storefrontSearch");
const { enrichDetailPrices } = require("./detailPriceEnricher");

class KabumCrawler extends BaseCrawler {
  constructor() {
    super({
      storeName: stores.kabum.name,
      enabled: stores.kabum.enabled,
      timeout: stores.kabum.timeout
    });
  }

  buildSearchUrl(query) {
    return searchUrlBuilders.kabum(query);
  }

  async performSearch(query) {
    const products = await searchStorefront(this, query, {
      url: this.buildSearchUrl(query),
      definition: definitions.kabum
    });

    return enrichDetailPrices(this, products.slice(0, this.maxResults), {
      concurrency: 5
    });
  }
}

module.exports = new KabumCrawler();
