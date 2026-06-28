const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";

const BaseCrawler = require("../src/crawlers/baseCrawler");
const definitions = require("../src/crawlers/storeDefinitions");
const searchUrlBuilders = require("../src/crawlers/searchUrlBuilders");
const { extractPricesFromText, extractProductsFromHtml } = require("../src/crawlers/productExtraction");
const { parseMoney } = require("../src/utils/money");
const { extractDetailPrices } = require("../src/crawlers/detailPriceEnricher");

test("searchUrlBuilders encode each store query", () => {
  assert.equal(searchUrlBuilders.kabum("SSD NVMe 1TB"), "https://www.kabum.com.br/busca/ssd-nvme-1tb");
  assert.match(searchUrlBuilders.pichau("mouse gamer"), /q=mouse%20gamer$/);
  assert.match(searchUrlBuilders.terabyte("mouse gamer"), /str=mouse%20gamer$/);
  assert.match(searchUrlBuilders.mercadoLivreApi("notebook ryzen 5"), /q=notebook%20ryzen%205/);
  assert.equal(searchUrlBuilders.amazon("mouse gamer"), "https://www.amazon.com.br/s?k=mouse%20gamer");
});

test("price extraction prefers PIX/cash and ignores installments", () => {
  const prices = extractPricesFromText(
    "De: R$ 519,90 por: R$ 319,90 à vista no PIX ou 12x de R$ 31,36 sem juros"
  );

  assert.equal(prices.price, 319.9);
  assert.equal(prices.pixPrice, 319.9);
  assert.equal(prices.oldPrice, 519.9);
  assert.equal(prices.matches.some((item) => item.amount === 31.36 && item.installment), true);
});

test("detail price extraction finds PIX below the card price", () => {
  const prices = extractDetailPrices(`
    <main>
      <span>R$ 505,87</span>
      <strong>R$ 179,99</strong><span>À vista no PIX com 15% de desconto</span>
      <span>R$ 211,75 em até 8x de R$ 26,46 sem juros</span>
    </main>
  `);

  assert.equal(prices.pixPrice, 179.99);
});

test("money parser understands Brazilian thousands without cents", () => {
  assert.equal(parseMoney("R$ 3.000"), 3000);
  assert.equal(parseMoney("R$ 3.000,00"), 3000);
  assert.equal(parseMoney("299.90"), 299.9);
});

test("HTML extraction returns the standard contract and preserves raw card", () => {
  const html = `
    <main>
      <div data-testid="product-card-container">
        <a href="/mouse-gamer/p/abc123/in/mger/"><h2 data-testid="product-title">Patrocinado Mouse Gamer RGB</h2></a>
        <img src="/mouse.jpg" alt="Mouse Gamer RGB">
        <span data-testid="price-value">R$ 199,90</span>
        <span data-testid="price-pix">R$ 149,90 no Pix</span>
        <span>10x de R$ 19,99 sem juros Frete grátis</span>
      </div>
    </main>
  `;
  const products = extractProductsFromHtml(html, definitions.magalu, "https://www.magazineluiza.com.br/busca/mouse/");

  assert.equal(products.length, 1);
  assert.deepEqual(
    Object.keys(products[0]).filter((key) => ["title", "price", "oldPrice", "link", "image", "store", "availability", "raw"].includes(key)),
    ["title", "price", "oldPrice", "link", "image", "store", "availability", "raw"]
  );
  assert.equal(products[0].title, "Mouse Gamer RGB");
  assert.equal(products[0].pixPrice, 149.9);
  assert.equal(products[0].link, "https://www.magazineluiza.com.br/mouse-gamer/p/abc123/in/mger/");
  assert.equal(products[0].raw.title, "Patrocinado Mouse Gamer RGB");
});

test("blocked HTML is classified without throwing from crawler.search", async () => {
  class BlockedCrawler extends BaseCrawler {
    constructor() {
      super({ storeName: "Amazon Test", timeout: 200 });
    }

    async performSearch(query) {
      return this.runStrategies(query, [{
        name: "html",
        timeoutMs: 100,
        run: () => extractProductsFromHtml("<html>Robot Check captcha</html>", definitions.amazon, "https://amazon.test")
      }]);
    }
  }

  const crawler = new BlockedCrawler();
  const products = await crawler.search("mouse gamer");

  assert.deepEqual(products, []);
  assert.equal(crawler.lastRun.status, "blocked");
  assert.match(crawler.lastRun.errorMessage, /bloqueada/i);
});

test("layered search continues after API 403 and accepts HTML results", async () => {
  class LayeredCrawler extends BaseCrawler {
    constructor() {
      super({ storeName: "Loja Teste", timeout: 500 });
    }

    async performSearch(query) {
      return this.runStrategies(query, [
        {
          name: "api",
          timeoutMs: 100,
          run: () => {
            const error = new Error("HTTP 403");
            error.statusCode = 403;
            throw error;
          }
        },
        {
          name: "html",
          timeoutMs: 100,
          run: () => [{ title: "SSD NVMe 1TB", price: 399.9, link: "https://loja.test/ssd" }]
        }
      ]);
    }
  }

  const crawler = new LayeredCrawler();
  const products = await crawler.search("ssd nvme 1tb");

  assert.equal(products.length, 1);
  assert.equal(crawler.lastRun.status, "success");
  assert.equal(crawler.lastRun.strategy, "html");
  assert.deepEqual(crawler.lastRun.strategies.map((item) => item.status), ["403", "success"]);
});

test("normalization always chooses the lowest explicit PIX/cash price", () => {
  const crawler = new BaseCrawler({ storeName: "Loja Teste" });
  const product = crawler.normalizeProduct({
    title: "Notebook Ryzen 5 R$ 3.000,00 no PIX",
    price: "R$ 3.500,00",
    pixPrice: "R$ 3.000,00",
    cashPrice: "R$ 3.200,00",
    oldPrice: "R$ 3.999,00",
    link: "https://loja.test/notebook"
  });

  assert.equal(product.title, "Notebook Ryzen 5");
  assert.equal(product.price, 3000);
  assert.equal(product.oldPrice, 3999);
  assert.equal(product.raw.title, "Notebook Ryzen 5 R$ 3.000,00 no PIX");
});
