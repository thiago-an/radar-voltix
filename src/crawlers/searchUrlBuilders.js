const { slugify } = require("../utils/text");

function encodeQuery(query) {
  return encodeURIComponent(String(query || "").trim());
}

function kabum(query) {
  return `https://www.kabum.com.br/busca/${slugify(query)}`;
}

function pichau(query) {
  return `https://www.pichau.com.br/search?q=${encodeQuery(query)}`;
}

function terabyte(query) {
  return `https://www.terabyteshop.com.br/busca?str=${encodeQuery(query)}`;
}

function mercadoLivre(query) {
  return `https://lista.mercadolivre.com.br/${slugify(query)}`;
}

function mercadoLivreApi(query, limit = 50) {
  return `https://api.mercadolibre.com/sites/MLB/search?q=${encodeQuery(query)}&limit=${Number(limit) || 50}`;
}

function amazon(query) {
  return `https://www.amazon.com.br/s?k=${encodeQuery(query)}`;
}

function magalu(query) {
  return `https://www.magazineluiza.com.br/busca/${slugify(query)}/`;
}

function casasBahia(query) {
  return `https://www.casasbahia.com.br/${slugify(query)}/b`;
}

function fastShop(query) {
  return `https://www.fastshop.com.br/web/q/${encodeQuery(query)}`;
}

function googleShopping(query) {
  return `https://www.google.com/search?tbm=shop&q=${encodeQuery(query)}`;
}

module.exports = {
  encodeQuery,
  kabum,
  pichau,
  terabyte,
  mercadoLivre,
  mercadoLivreApi,
  amazon,
  magalu,
  casasBahia,
  fastShop,
  googleShopping
};
