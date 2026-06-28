const BaseCrawler = require("./baseCrawler");
const { stores } = require("../config/stores");
const searchUrlBuilders = require("./searchUrlBuilders");
const definitions = require("./storeDefinitions");
const searchStorefront = require("./storefrontSearch");

class MercadoLivreCrawler extends BaseCrawler {
  constructor() {
    super({
      storeName: stores.mercadoLivre.name,
      enabled: stores.mercadoLivre.enabled,
      timeout: stores.mercadoLivre.timeout
    });
  }

  buildSearchUrl(query) {
    return searchUrlBuilders.mercadoLivre(query);
  }

  async searchApi(query) {
    const payload = await this.fetchJson({
      url: searchUrlBuilders.mercadoLivreApi(query, Math.max(this.maxResults, 20))
    });

    return (Array.isArray(payload?.results) ? payload.results : []).map((product) => ({
      title: product.title,
      price: product.sale_price?.amount || product.price,
      cashPrice: product.sale_price?.amount || product.price,
      oldPrice: product.original_price,
      link: product.permalink,
      image: product.thumbnail?.replace(/^http:/i, "https:"),
      store: this.storeName,
      availability: Number(product.available_quantity) === 0 ? "unavailable" : "available",
      raw: product
    }));
  }

  async performSearch(query) {
    return searchStorefront(this, query, {
      url: this.buildSearchUrl(query),
      definition: definitions.mercadoLivre,
      apiSearch: () => this.searchApi(query)
    });
  }
}

module.exports = new MercadoLivreCrawler();
