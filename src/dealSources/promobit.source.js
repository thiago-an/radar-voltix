const BaseDealSource = require("./baseDealSource");
const { dealSources } = require("../config/dealSources");
const { slugify } = require("../utils/text");
const definitions = require("./dealSourceDefinitions");
const searchDealSource = require("./sourceSearch");

class PromobitSource extends BaseDealSource {
  constructor() {
    super({
      sourceName: dealSources.promobit.name,
      enabled: dealSources.promobit.enabled,
      timeout: dealSources.promobit.timeout
    });
  }

  buildSearchUrls(query) {
    return [
      `https://www.promobit.com.br/busca/${slugify(query)}/`,
      `https://www.promobit.com.br/busca?q=${encodeURIComponent(query)}`
    ];
  }

  async performSearch(query) {
    return searchDealSource(this, query, {
      urls: this.buildSearchUrls(query),
      definition: definitions.promobit
    });
  }
}

module.exports = new PromobitSource();
