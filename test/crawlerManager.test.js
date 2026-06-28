const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

process.env.NODE_ENV = "test";

const { CrawlerManager } = require("../src/services/crawlerManager.service");

function sleep(durationMs) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

function createCrawler(options) {
  return {
    storeName: options.storeName,
    enabled: true,
    timeout: options.timeout || 500,
    lastRun: null,
    async search() {
      options.startedAt.push(Date.now());

      if (options.neverSettles) {
        return new Promise(() => {});
      }

      await sleep(options.delayMs);

      if (options.error) {
        throw new Error(options.error);
      }

      const products = options.products || [];
      this.lastRun = {
        status: products.length ? "success" : "empty",
        productsFound: products.length,
        errorMessage: null
      };
      return products;
    }
  };
}

test("CrawlerManager runs stores in parallel and isolates failures", async () => {
  const starts = {
    kabum: [],
    pichau: [],
    terabyte: []
  };
  const logs = [];
  const manager = new CrawlerManager({
    discoverCrawlers: () => [
      createCrawler({
        storeName: "Kabum",
        delayMs: 80,
        products: [{ title: "A" }, { title: "B" }],
        startedAt: starts.kabum
      }),
      createCrawler({
        storeName: "Pichau",
        delayMs: 45,
        error: "HTTP 403 em https://pichau.test",
        startedAt: starts.pichau
      }),
      createCrawler({
        storeName: "Terabyte",
        timeout: 30,
        neverSettles: true,
        startedAt: starts.terabyte
      })
    ],
    logRepository: {
      create: (entry) => logs.push(entry)
    },
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {}
    }
  });
  const startedAt = Date.now();
  const result = await manager.run([{
    id: 1,
    query: "produto teste",
    allowedStores: []
  }]);
  const elapsedMs = Date.now() - startedAt;
  const statusByCrawler = new Map(result.runs.map((run) => [run.crawler, run.status]));
  const firstStarts = [starts.kabum[0], starts.pichau[0], starts.terabyte[0]];

  assert.ok(Math.max(...firstStarts) - Math.min(...firstStarts) < 30);
  assert.ok(elapsedMs < 170, `Execucao deveria ser paralela, mas levou ${elapsedMs}ms`);
  assert.equal(statusByCrawler.get("Kabum"), "success");
  assert.equal(statusByCrawler.get("Pichau"), "403");
  assert.equal(statusByCrawler.get("Terabyte"), "timeout");
  assert.equal(result.productsFound, 2);
  assert.equal(result.results.find((entry) => entry.crawler === "Kabum").products.length, 2);
  assert.equal(logs.length, 3);
  assert.ok(logs.every((entry) => entry.startedAt && entry.finishedAt));
  assert.match(result.summaryText, /Kabum .* OK \(2 produtos/);
  assert.match(result.summaryText, /Pichau .* 403/);
  assert.match(result.summaryText, /Terabyte .* TIMEOUT/);
});

test("Radar Service delegates acquisition to both isolated managers", () => {
  const radarSource = fs.readFileSync(
    path.resolve(__dirname, "..", "src", "services", "radar.service.js"),
    "utf8"
  );

  assert.match(radarSource, /crawlerManager\.run\(watchlistItems\)/);
  assert.match(radarSource, /dealSourceManager\.run\(watchlistItems\)/);
  assert.match(radarSource, /Promise\.allSettled/);
  assert.match(radarSource, /\.\.\.dealSourceExecution\.results/);
  assert.ok(radarSource.indexOf("marketplaceAdvisorService.compareMarketplaces") < radarSource.indexOf("notificationService.notifyOpportunity"));
  assert.ok(radarSource.indexOf("inventoryService.getStockForProduct") < radarSource.indexOf("notificationService.notifyOpportunity"));
  assert.doesNotMatch(radarSource, /crawler\.search\(/);
  assert.doesNotMatch(radarSource, /require\(["']\.\.\/crawlers["']\)/);
});
