const test = require("node:test");
const assert = require("node:assert/strict");
const priceAnalytics = require("../src/services/priceAnalytics.service");

test("analisa histórico de preços com média, menor e maior preço", () => {
  const result = priceAnalytics.analyzeHistory([
    { price: 300, capturedAt: "2026-06-01T00:00:00Z" },
    { price: 250, capturedAt: "2026-06-02T00:00:00Z" },
    { price: 200, capturedAt: "2026-06-03T00:00:00Z" }
  ]);

  assert.equal(result.records, 3);
  assert.equal(result.currentPrice, 200);
  assert.equal(result.lowestPrice, 200);
  assert.equal(result.highestPrice, 300);
  assert.equal(Math.round(result.averagePrice), 250);
  assert.equal(result.trend, "falling");
});

test("retorna estado vazio quando não existe histórico", () => {
  const result = priceAnalytics.analyzeHistory([]);

  assert.equal(result.records, 0);
  assert.equal(result.currentPrice, null);
  assert.equal(result.trend, "unknown");
});