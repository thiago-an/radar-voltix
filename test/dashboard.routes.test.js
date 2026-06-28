const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

process.env.NODE_ENV = "test";
const databasePath = path.join(os.tmpdir(), `radar-voltix-dashboard-${process.pid}.sqlite`);
process.env.DATABASE_PATH = databasePath;

const app = require("../src/app");
const { closeDatabase, initializeDatabase } = require("../src/database/db");
const crawlerLogRepository = require("../src/repositories/crawlerLog.repository");
const alertRepository = require("../src/repositories/alert.repository");
const productRepository = require("../src/repositories/product.repository");

let server;
let baseUrl;

test.before(async () => {
  initializeDatabase();

  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
  });

  closeDatabase();
  [databasePath, `${databasePath}-shm`, `${databasePath}-wal`].forEach((file) => {
    fs.rmSync(file, { force: true });
  });
});

test("GET /dashboard serves the dashboard", async () => {
  const response = await fetch(`${baseUrl}/dashboard`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.match(html, /Radar Voltix \| Dashboard/);
  assert.match(html, /Executar Radar Agora/);
  assert.match(html, /Testar WhatsApp/);
  assert.match(html, /Novo Produto/);
  assert.match(html, /Status das Lojas/);
  assert.match(html, /Status das Fontes/);
  assert.match(html, /Simulador de lucro/);
  assert.match(html, /Top Lucros do Dia/);
  assert.match(html, /Melhor Marketplace/);
  assert.match(html, /MARKETPLACE INTELLIGENCE/);
  assert.match(html, />Estoque</);
  assert.match(html, /Adicionar compra/);
  assert.match(html, /Registrar venda/);
  assert.match(html, /id="movement-dialog"/);
  assert.match(html, /id="watchlist-form"/);
  assert.match(html, /id="watchlist-search"/);
});

test("dashboard assets are served locally", async () => {
  const [cssResponse, jsResponse] = await Promise.all([
    fetch(`${baseUrl}/dashboard/assets/dashboard.css`),
    fetch(`${baseUrl}/dashboard/assets/dashboard.js`)
  ]);

  assert.equal(cssResponse.status, 200);
  assert.match(cssResponse.headers.get("content-type"), /text\/css/);
  assert.equal(jsResponse.status, 200);
  assert.match(jsResponse.headers.get("content-type"), /javascript/);

  const javascript = await jsResponse.text();
  assert.match(javascript, /request\("\/radar\/run"/);
  assert.match(javascript, /request\("\/whatsapp\/test"/);
  assert.match(javascript, /request\("\/crawlers\/status"/);
  assert.match(javascript, /request\("\/deal-sources\/status"/);
  assert.match(javascript, /request\("\/profit\/top\?limit=10"/);
  assert.match(javascript, /request\("\/inventory"/);
  assert.match(javascript, /\/marketplace-advisor\/\$\{state\.marketplaceAdvisorProduct\.productId\}/);
  assert.match(javascript, /\/inventory\/\$\{itemId\}\/movement/);
  assert.match(javascript, /Ajuste manual/);
  assert.match(javascript, /\/profit\/simulate\?/);
  assert.match(javascript, /method: id \? "PUT" : "POST"/);
  assert.match(javascript, /method: "DELETE"/);
});

test("Marketplace Advisor endpoint compares a product using its watchlist context", async () => {
  const watchlistResponse = await fetch(`${baseUrl}/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Console Portatil Advisor",
      query: "console portatil advisor",
      maxBuyPrice: 900,
      expectedSellPrice: 1399,
      minMarginPercent: 20,
      priority: 3,
      allowedStores: []
    })
  });
  const watchlistItem = await watchlistResponse.json();
  const product = productRepository.upsert({
    title: "Console Portatil Advisor",
    price: 800,
    oldPrice: null,
    store: "Loja Teste",
    link: "https://example.test/console-advisor",
    image: null,
    raw: null,
    availability: "available"
  });

  alertRepository.create({
    watchlistId: watchlistItem.id,
    productId: product.id,
    productTitle: product.title,
    store: product.store,
    price: product.price,
    link: product.link,
    score: 91,
    recommendation: "COMPRAR AGORA",
    hash: `advisor-${product.id}`
  });

  const response = await fetch(`${baseUrl}/marketplace-advisor/${product.id}`);
  const comparison = await response.json();

  assert.equal(response.status, 200);
  assert.equal(comparison.length, 4);
  assert.deepEqual(comparison.map((item) => item.ranking), [1, 2, 3, 4]);
  assert.ok(comparison.every((item) => item.grossProfit === 599));
  assert.ok(comparison[0].netProfit >= comparison[1].netProfit);

  const missingResponse = await fetch(`${baseUrl}/marketplace-advisor/999999`);
  assert.equal(missingResponse.status, 404);

  await fetch(`${baseUrl}/watchlist/${watchlistItem.id}`, { method: "DELETE" });
});

test("inventory API supports CRUD, movements and summary totals", async () => {
  const createResponse = await fetch(`${baseUrl}/inventory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Notebook Ryzen 5",
      sku: "NOTE-R5-API",
      category: "Notebooks",
      quantity: 3,
      purchasePrice: 2200,
      expectedSellPrice: 2999,
      marketplace: "mercadolivre",
      notes: "Compra de teste"
    })
  });
  const created = await createResponse.json();

  assert.equal(createResponse.status, 201);
  assert.equal(created.quantity, 3);
  assert.equal(created.totalCost, 6600);

  const detailResponse = await fetch(`${baseUrl}/inventory/${created.id}`);
  const detail = await detailResponse.json();
  assert.equal(detailResponse.status, 200);
  assert.equal(detail.movements.length, 1);
  assert.equal(detail.movements[0].type, "purchase");

  const saleResponse = await fetch(`${baseUrl}/inventory/${created.id}/movement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "sale", quantity: 1, unitPrice: 2999 })
  });
  const sale = await saleResponse.json();
  assert.equal(saleResponse.status, 201);
  assert.equal(sale.item.quantity, 2);
  assert.equal(sale.item.reorderRecommended, true);

  const updateResponse = await fetch(`${baseUrl}/inventory/${created.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expectedSellPrice: 3099, category: "Notebook" })
  });
  const updated = await updateResponse.json();
  assert.equal(updateResponse.status, 200);
  assert.equal(updated.expectedSellPrice, 3099);
  assert.equal(updated.quantity, 2);

  const oversellResponse = await fetch(`${baseUrl}/inventory/${created.id}/movement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "sale", quantity: 3 })
  });
  assert.equal(oversellResponse.status, 409);

  const listResponse = await fetch(`${baseUrl}/inventory`);
  const list = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(list.summary.productsInStock >= 1, true);
  assert.equal(list.data.some((item) => item.id === created.id), true);

  const deleteResponse = await fetch(`${baseUrl}/inventory/${created.id}`, { method: "DELETE" });
  assert.equal(deleteResponse.status, 204);

  const missingResponse = await fetch(`${baseUrl}/inventory/${created.id}`);
  assert.equal(missingResponse.status, 404);
});

test("GET /profit/simulate validates and returns a complete calculation", async () => {
  const response = await fetch(`${baseUrl}/profit/simulate?buy=220&sell=349&marketplace=mercadolivre&shipping=10&packaging=5`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.grossProfit, 129);
  assert.equal(body.netProfit, 65.14);
  assert.equal(body.roi, 29.61);
  assert.equal(body.totalFees, 63.86);
  assert.equal(body.recommended, true);

  const invalidResponse = await fetch(`${baseUrl}/profit/simulate?buy=0&sell=349&marketplace=mercadolivre`);
  assert.equal(invalidResponse.status, 400);
});

test("GET /deal-sources/status returns enabled and disabled source status", async () => {
  const now = new Date().toISOString();
  crawlerLogRepository.create({
    crawler: "Deal Source: Pelando",
    query: "produto teste",
    startedAt: now,
    finishedAt: now,
    durationMs: 432,
    status: "success",
    productsFound: 5
  });

  const response = await fetch(`${baseUrl}/deal-sources/status`);
  const body = await response.json();
  const pelando = body.sources.find((source) => source.source === "Pelando");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.enabledSources));
  assert.ok(pelando);
  assert.equal(pelando.enabled, true);
  assert.equal(pelando.status, "success");
  assert.equal(pelando.productsFound, 5);
  assert.ok(body.sources.some((source) => source.enabled === false && source.status === "disabled"));
});

test("GET /crawlers/status returns latest enabled store statistics", async () => {
  const now = new Date().toISOString();
  crawlerLogRepository.create({
    crawler: "Kabum",
    query: "produto teste",
    startedAt: now,
    finishedAt: now,
    durationMs: 1234,
    status: "success",
    productsFound: 7
  });

  const response = await fetch(`${baseUrl}/crawlers/status`);
  const body = await response.json();
  const kabum = body.stores.find((store) => store.crawler === "Kabum");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.enabledStores));
  assert.ok(body.stores.some((store) => store.enabled === false && store.status === "disabled"));
  assert.ok(kabum);
  assert.equal(kabum.enabled, true);
  assert.equal(kabum.status, "success");
  assert.equal(kabum.productsFound, 7);
  assert.equal(kabum.durationMs, 1234);
});

test("watchlist API supports validated CRUD and status updates", async () => {
  const invalidResponse = await fetch(`${baseUrl}/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: " ",
      query: "",
      maxBuyPrice: -1,
      expectedSellPrice: 0,
      minMarginPercent: -2,
      priority: 7
    })
  });
  const invalidBody = await invalidResponse.json();

  assert.equal(invalidResponse.status, 400);
  assert.match(invalidBody.error, /maxBuyPrice deve ser positivo/);
  assert.match(invalidBody.error, /priority deve estar entre 1 e 5/);

  const createResponse = await fetch(`${baseUrl}/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "  Monitor Gamer  ",
      query: " monitor gamer 144hz ",
      maxBuyPrice: 800,
      expectedSellPrice: 1099.9,
      minMarginPercent: 20,
      category: " Monitores ",
      priority: 4,
      allowedStores: ["Kabum", "Kabum", " Pichau "],
      enabled: true
    })
  });
  const created = await createResponse.json();

  assert.equal(createResponse.status, 201);
  assert.equal(created.name, "Monitor Gamer");
  assert.equal(created.category, "Monitores");
  assert.deepEqual(created.allowedStores, ["Kabum", "Pichau"]);

  const updateResponse = await fetch(`${baseUrl}/watchlist/${created.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: false, priority: 5 })
  });
  const updated = await updateResponse.json();

  assert.equal(updateResponse.status, 200);
  assert.equal(updated.enabled, false);
  assert.equal(updated.priority, 5);

  const listResponse = await fetch(`${baseUrl}/watchlist?includeDisabled=true`);
  const list = await listResponse.json();
  assert.equal(list.data.some((item) => item.id === created.id && !item.enabled), true);

  const deleteResponse = await fetch(`${baseUrl}/watchlist/${created.id}`, { method: "DELETE" });
  assert.equal(deleteResponse.status, 204);

  const finalListResponse = await fetch(`${baseUrl}/watchlist?includeDisabled=true`);
  const finalList = await finalListResponse.json();
  assert.equal(finalList.data.some((item) => item.id === created.id), false);
});

test("GET /health keeps existing fields and includes radar status", async () => {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.app, "Radar Voltix");
  assert.ok(body.whatsapp);
  assert.deepEqual(body.radar, {
    running: false,
    lastRun: null,
    lastError: null
  });
});
