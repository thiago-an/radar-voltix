const BaseDealSource = require("./baseDealSource");
const { dealSources } = require("../config/dealSources");
const definitions = require("./dealSourceDefinitions");
const searchDealSource = require("./sourceSearch");

class PelandoSource extends BaseDealSource {
  constructor() {
    super({
      sourceName: dealSources.pelando.name,
      enabled: dealSources.pelando.enabled,
      timeout: dealSources.pelando.timeout
    });
  }

  buildSearchUrl(query) {
    return `https://www.pelando.com.br/search?q=${encodeURIComponent(query)}`;
  }

  async performSearch(query) {
    return searchDealSource(this, query, {
      url: this.buildSearchUrl(query),
      definition: definitions.pelando
    });
  }
}

module.exports = new PelandoSource();
