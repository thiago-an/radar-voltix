const BaseDealSource = require("./baseDealSource");
const { dealSources } = require("../config/dealSources");
const definitions = require("./dealSourceDefinitions");
const searchDealSource = require("./sourceSearch");

class GoogleShoppingSource extends BaseDealSource {
  constructor() {
    super({
      sourceName: dealSources.googleShopping.name,
      enabled: dealSources.googleShopping.enabled,
      timeout: dealSources.googleShopping.timeout
    });
  }

  buildSearchUrl(query) {
    return `https://www.google.com/search?tbm=shop&hl=pt-BR&gl=br&q=${encodeURIComponent(query)}`;
  }

  async performSearch(query) {
    return searchDealSource(this, query, {
      url: this.buildSearchUrl(query),
      definition: definitions.googleShopping
    });
  }
}

module.exports = new GoogleShoppingSource();
