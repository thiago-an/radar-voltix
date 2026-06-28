const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

process.env.NODE_ENV = "test";
const databasePath = path.join(os.tmpdir(), `radar-voltix-inventory-${process.pid}.sqlite`);
process.env.DATABASE_PATH = databasePath;

const { closeDatabase, initializeDatabase } = require("../src/database/db");
const inventoryService = require("../src/services/inventory.service");
const { buildOpportunityMessage } = require("../src/services/notification.service");

test.before(() => initializeDatabase());

test.after(() => {
  closeDatabase();
  [databasePath, `${databasePath}-shm`, `${databasePath}-wal`].forEach((file) => fs.rmSync(file, { force: true }));
});

test("inventory records purchases, sales and signed adjustments atomically", () => {
  const created = inventoryService.create({
    name: "Mouse Gamer Logitech G Pro X Superlight",
    sku: "MOUSE-GPRO-X",
    category: "Perifericos",
    quantity: 5,
    purchasePrice: 100,
    expectedSellPrice: 220,
    marketplace: "mercadolivre",
    notes: "Primeiro lote"
  });

  assert.equal(created.quantity, 5);
  assert.equal(created.totalCost, 500);
  assert.equal(created.reorderRecommended, false);

  const purchase = inventoryService.addMovement(created.id, {
    type: "purchase",
    quantity: 3,
    unitPrice: 150,
    notes: "Segundo lote"
  });
  assert.equal(purchase.item.quantity, 8);
  assert.equal(purchase.item.purchasePrice, 118.75);

  const sale = inventoryService.addMovement(created.id, {
    type: "sale",
    quantity: 2,
    unitPrice: 220
  });
  assert.equal(sale.item.quantity, 6);
  assert.equal(sale.movement.type, "sale");

  const adjustment = inventoryService.addMovement(created.id, {
    type: "adjustment",
    quantity: -4,
    notes: "Contagem fisica"
  });
  assert.equal(adjustment.item.quantity, 2);
  assert.equal(adjustment.item.reorderRecommended, true);

  assert.throws(
    () => inventoryService.addMovement(created.id, { type: "sale", quantity: 3 }),
    (error) => error.statusCode === 409 && /Estoque insuficiente/.test(error.message)
  );

  const movements = inventoryService.listMovements(created.id);
  assert.deepEqual(movements.map((movement) => movement.type).sort(), ["adjustment", "purchase", "purchase", "sale"]);

  const stock = inventoryService.getStockForProduct({
    title: "Mouse Gamer Logitech G Pro X Superlight",
    raw: { sku: "MOUSE-GPRO-X" }
  });
  assert.deepEqual(stock.itemIds, [created.id]);
  assert.equal(stock.quantity, 2);
  assert.equal(stock.matchedBy, "sku");
  assert.equal(stock.reorderRecommended, true);

  const result = inventoryService.list();
  assert.equal(result.summary.productsInStock, 1);
  assert.equal(result.summary.totalQuantity, 2);
  assert.equal(result.summary.totalCost, 237.5);
});

test("inventory validates records, SKU uniqueness and cascade deletion", () => {
  assert.throws(
    () => inventoryService.create({ name: "Invalido", quantity: -1, purchasePrice: 0, expectedSellPrice: 0 }),
    (error) => error.statusCode === 400
  );

  const item = inventoryService.create({
    name: "SSD NVMe 1TB",
    sku: "SSD-1TB",
    quantity: 1,
    purchasePrice: 250,
    expectedSellPrice: 399,
    marketplace: "shopee"
  });

  assert.throws(
    () => inventoryService.create({
      name: "SSD duplicado",
      sku: "SSD-1TB",
      quantity: 1,
      purchasePrice: 200,
      expectedSellPrice: 350,
      marketplace: "shopee"
    }),
    (error) => error.statusCode === 409
  );

  assert.equal(inventoryService.remove(item.id), true);
  assert.equal(inventoryService.get(item.id), null);
  assert.deepEqual(inventoryService.listMovements(item.id), []);
});

test("opportunity message includes current inventory and replenishment warning", () => {
  const baseArguments = [
    { store: "Kabum", title: "Mouse Gamer", link: "https://example.test/mouse" },
    { name: "Mouse Gamer" },
    { buyPrice: 100, expectedSellPrice: 220, grossProfit: 120, marginPercent: 50, score: 90, recommendation: "Comprar" },
    { grossProfit: 120, totalFees: 40, netProfit: 80, roi: 80 },
    { name: "Mercado Livre" }
  ];

  const lowStockMessage = buildOpportunityMessage(...baseArguments, { quantity: 2, reorderRecommended: true });
  assert.match(lowStockMessage, /Voc[eê].*2 unidades em estoque/);
  assert.match(lowStockMessage, /Hora de repor estoque/);

  const healthyStockMessage = buildOpportunityMessage(...baseArguments, { quantity: 5, reorderRecommended: false });
  assert.match(healthyStockMessage, /5 unidades em estoque/);
  assert.match(healthyStockMessage, /Melhor lugar para vender.*Mercado Livre/);
  assert.doesNotMatch(healthyStockMessage, /Hora de repor estoque/);

  const advisedMessage = buildOpportunityMessage(
    ...baseArguments,
    { quantity: 5, reorderRecommended: false },
    [{ marketplace: "Facebook Marketplace", ranking: 1 }]
  );
  assert.match(advisedMessage, /Melhor lugar para vender.*Facebook Marketplace/);
});
