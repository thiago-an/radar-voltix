const test = require("node:test");
const assert = require("node:assert/strict");
const relevance = require("../src/services/productRelevance.service");

test("reconhece produto relevante pela query", () => {
  const product = {
    title: "Mouse Gamer Logitech G305 Lightspeed Sem Fio"
  };

  const watchlistItem = {
    query: "logitech g305"
  };

  const result = relevance.calculateRelevance(product, watchlistItem);

  assert.equal(result.relevant, true);
  assert.equal(result.matchedWords.includes("logitech"), true);
  assert.equal(result.matchedWords.includes("g305"), true);
});

test("ignora produto sem relação suficiente", () => {
  const product = {
    title: "Cooler para Processador Intel LGA 1700"
  };

  const watchlistItem = {
    query: "ryzen 5 7600"
  };

  const result = relevance.calculateRelevance(product, watchlistItem);

  assert.equal(result.relevant, false);
});