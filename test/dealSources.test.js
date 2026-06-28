const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";

const BaseDealSource = require("../src/dealSources/baseDealSource");
const definitions = require("../src/dealSources/dealSourceDefinitions");
const { discoverDealSources } = require("../src/dealSources");
const { extractDealsFromHtml } = require("../src/dealSources/dealSourceExtraction");

test("Deal Sources are discovered from source files", () => {
  const names = discoverDealSources().map((source) => source.sourceName);
  assert.deepEqual(names, ["Google Shopping", "Pelando", "Promobit"]);
});

test("Pelando HTML extraction identifies retailer, price and expired deals", () => {
  const html = `
    <article data-testid="deal-card">
      <a href="/d/mouse-gamer-redragon-1234"><h2>Mouse Gamer Redragon</h2></a>
      <img src="/mouse.jpg" alt="Mouse Gamer Redragon">
      <del>R$ 199,90</del>
      <strong data-testid="deal-price">R$ 129,90</strong>
      <span>Vendido por Kabum · Expirado</span>
    </article>
  `;
  const products = extractDealsFromHtml(
    html,
    definitions.pelando,
    "https://www.pelando.com.br/search?q=mouse",
    "Pelando"
  );

  assert.equal(products.length, 1);
  assert.equal(products[0].price, 129.9);
  assert.equal(products[0].oldPrice, 199.9);
  assert.equal(products[0].store, "Kabum");
  assert.equal(products[0].source, "Pelando");
  assert.equal(products[0].availability, "unavailable");
  assert.equal(products[0].link, "https://www.pelando.com.br/d/mouse-gamer-redragon-1234");
});

test("BaseDealSource always returns the standard source contract", () => {
  const source = new BaseDealSource({ sourceName: "Fonte Teste" });
  const product = source.normalizeProduct({
    title: "SSD NVMe 1TB",
    price: "R$ 399,90",
    oldPrice: "R$ 499,90",
    link: "https://fonte.test/oferta/ssd",
    image: "https://fonte.test/ssd.jpg",
    store: "Loja Teste",
    availability: "available",
    raw: { title: "SSD NVMe 1TB", payload: true }
  });

  assert.deepEqual(Object.keys(product), [
    "title",
    "price",
    "oldPrice",
    "link",
    "image",
    "store",
    "source",
    "availability",
    "raw"
  ]);
  assert.equal(product.source, "Fonte Teste");
  assert.equal(product.raw.source, "Fonte Teste");
});
