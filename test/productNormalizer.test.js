const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";

const productNormalizer = require("../src/services/productNormalizer");
const { env } = require("../src/config/env");
const logger = require("../src/utils/logger");

const dirtyTitle = "\uf0ec Avalia\u00e7\u00e3o 5.0 de 5.0 \ue87d Produto Patrocinado Mouse Gamer com Fio Fantech Phantom II VX6, 7200 DPI, 7 bot\u00f5es, Preto - Phantom II VX6 B R$ 79,99 Desconto: -15% No PIX ou 3x de R$ 31,37 Restam 49 Unid.";
const cleanTitle = "Mouse Gamer com Fio Fantech Phantom II VX6, 7200 DPI, 7 bot\u00f5es, Preto - Phantom II VX6 B";

test("cleanProductTitle removes Kabum card noise", () => {
  assert.equal(productNormalizer.cleanProductTitle(dirtyTitle), cleanTitle);
});

test("normalizeProduct preserves raw title and product metadata", () => {
  const input = {
    title: dirtyTitle,
    price: 79.99,
    oldPrice: 99.99,
    link: "https://www.kabum.com.br/produto/123",
    image: "https://images.kabum.com.br/produto/123.jpg",
    store: "Kabum"
  };

  const normalized = productNormalizer.normalizeProduct(input);
  const cleanNormalized = productNormalizer.normalizeProduct({ title: cleanTitle });

  assert.equal(normalized.title, cleanTitle);
  assert.equal(normalized.productTitle, cleanTitle);
  assert.equal(normalized.raw.title, dirtyTitle);
  assert.equal(normalized.price, input.price);
  assert.equal(normalized.oldPrice, input.oldPrice);
  assert.equal(normalized.link, input.link);
  assert.equal(normalized.image, input.image);
  assert.equal(normalized.productHash, cleanNormalized.productHash);
  assert.equal(normalized.normalizedTitle, cleanNormalized.normalizedTitle);
});

test("cleanProductTitle removes standalone offer labels", () => {
  assert.equal(
    productNormalizer.cleanProductTitle("Teclado Mec\u00e2nico Frete gr\u00e1tis Resta 1 Unid."),
    "Teclado Mec\u00e2nico"
  );
});

test("normalizeProduct logs title cleaning only in development", () => {
  const originalNodeEnv = env.nodeEnv;
  const originalLoggerInfo = logger.info;
  const messages = [];

  logger.info = (message) => messages.push(message);

  try {
    env.nodeEnv = "development";
    productNormalizer.normalizeProduct({ title: dirtyTitle });

    assert.deepEqual(messages, [
      `Titulo original: ${dirtyTitle}`,
      `Titulo limpo: ${cleanTitle}`
    ]);

    messages.length = 0;
    env.nodeEnv = "production";
    productNormalizer.normalizeProduct({ title: dirtyTitle });

    assert.deepEqual(messages, []);
  } finally {
    env.nodeEnv = originalNodeEnv;
    logger.info = originalLoggerInfo;
  }
});
