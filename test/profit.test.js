const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

process.env.NODE_ENV = "test";
const databasePath = path.join(os.tmpdir(), `radar-voltix-profit-${process.pid}.sqlite`);
process.env.DATABASE_PATH = databasePath;

const { closeDatabase, initializeDatabase } = require("../src/database/db");
const priceHistoryRepository = require("../src/repositories/priceHistory.repository");
const watchlistRepository = require("../src/repositories/watchlist.repository");
const profitService = require("../src/services/profit.service");
const marketplaceAdvisorService = require("../src/services/marketplaceAdvisor.service");

test.before(() => initializeDatabase());

test.after(() => {
  closeDatabase();
  [databasePath, `${databasePath}-shm`, `${databasePath}-wal`].forEach((file) => fs.rmSync(file, { force: true }));
});

test("calculateProfit returns net profit, ROI and recommendation", () => {
  const result = profitService.calculateProfit({
    purchasePrice: 220,
    sellPrice: 349,
    marketplace: "mercadolivre",
    shippingCost: 10,
    packagingCost: 5
  });

  assert.deepEqual(result, {
    grossProfit: 129,
    netProfit: 65.14,
    roi: 29.61,
    totalFees: 63.86,
    recommended: true
  });
});

test("calculateProfit requires both minimum net profit and ROI", () => {
  const result = profitService.calculateProfit({
    purchasePrice: 20,
    sellPrice: 59,
    marketplace: "mercadolivre",
    shippingCost: 0,
    packagingCost: 0
  });

  assert.equal(result.roi > 20, true);
  assert.equal(result.netProfit < 30, true);
  assert.equal(result.recommended, false);
});

test("calculateProfit accepts marketplace aliases and rejects invalid input", () => {
  assert.equal(profitService.calculateProfit({
    purchasePrice: 100,
    sellPrice: 200,
    marketplace: "TikTok Shop",
    shippingCost: 0
  }).recommended, true);

  assert.throws(
    () => profitService.calculateProfit({ purchasePrice: 100, sellPrice: 200, marketplace: "inexistente" }),
    /Marketplace nao suportado/
  );
});

test("Marketplace Advisor ranks every marketplace by net profit", () => {
  const comparison = marketplaceAdvisorService.compareMarketplaces({
    purchasePrice: 220,
    expectedSellPrice: 349,
    packagingCost: 5
  });

  assert.equal(comparison.length, 4);
  assert.deepEqual(comparison.map((item) => item.ranking), [1, 2, 3, 4]);
  assert.deepEqual(
    new Set(comparison.map((item) => item.marketplaceKey)),
    new Set(["mercadolivre", "shopee", "tiktokshop", "facebook"])
  );
  assert.ok(comparison.every((item) => item.grossProfit === 129));
  assert.ok(comparison.every((item, index) => index === 0 || comparison[index - 1].netProfit >= item.netProfit));
  assert.ok(comparison.every((item) => typeof item.notes === "string" && item.notes.length > 0));
});

test("Top Profits uses today's latest history record per product", () => {
  const watchlist = watchlistRepository.create({
    name: "SSD Teste",
    query: "ssd teste",
    maxBuyPrice: 300,
    expectedSellPrice: 500,
    minMarginPercent: 20,
    priority: 3,
    allowedStores: []
  });
  const now = new Date().toISOString();

  priceHistoryRepository.create({
    watchlistId: watchlist.id,
    crawler: "Kabum",
    productTitle: "SSD A",
    normalizedTitle: "ssd a",
    productHash: "hash-a",
    price: 250,
    availability: "available",
    capturedAt: now
  });
  priceHistoryRepository.create({
    watchlistId: watchlist.id,
    crawler: "Pichau",
    productTitle: "SSD B",
    normalizedTitle: "ssd b",
    productHash: "hash-b",
    price: 300,
    availability: "available",
    capturedAt: now
  });

  const top = profitService.listTopProfitsToday(10);

  assert.equal(top.length, 2);
  assert.equal(top[0].productTitle, "SSD A");
  assert.ok(top[0].netProfit > top[1].netProfit);
});
