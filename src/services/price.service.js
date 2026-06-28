const productRepository = require("../repositories/product.repository");
const { parseMoney } = require("../utils/money");

function recordProductSnapshot(rawProduct) {
  const price = parseMoney(rawProduct.price);

  if (!Number.isFinite(price)) {
    throw new Error(`Produto sem preco valido: ${rawProduct.title || "sem titulo"}`);
  }

  const product = productRepository.upsert({
    title: rawProduct.title,
    price,
    oldPrice: parseMoney(rawProduct.oldPrice),
    link: rawProduct.url || rawProduct.link,
    image: rawProduct.image,
    store: rawProduct.store,
    availability: rawProduct.availability || "unknown",
    raw: rawProduct.raw || rawProduct
  });

  return product;
}

module.exports = {
  recordProductSnapshot
};
