const { getEnabledCrawlers } = require("../crawlers");

const QUERIES = [
  "mouse gamer",
  "ssd nvme 1tb",
  "notebook ryzen 5"
];

function selectStatus(statuses, productsFound) {
  if (productsFound > 0) {
    return "OK";
  }

  return ["blocked", "403", "429", "timeout", "error", "empty"]
    .find((status) => statuses.includes(status)) || "empty";
}

async function testCrawler(crawler) {
  const queryResults = [];

  for (const query of QUERIES) {
    const startedAt = Date.now();
    const products = await crawler.search(query);
    queryResults.push({
      query,
      status: crawler.lastRun?.status || (products.length ? "success" : "empty"),
      productsFound: products.length,
      durationMs: Date.now() - startedAt,
      errorMessage: crawler.lastRun?.errorMessage || null
    });
  }

  const productsFound = queryResults.reduce((total, result) => total + result.productsFound, 0);
  return {
    crawler: crawler.storeName,
    status: selectStatus(queryResults.map((result) => result.status), productsFound),
    productsFound,
    queryResults
  };
}

(async () => {
  const crawlers = getEnabledCrawlers();

  if (!crawlers.length) {
    console.log("Nenhum crawler habilitado no .env.");
    return;
  }

  console.log(`Testando ${crawlers.length} crawlers com ${QUERIES.length} consultas...\n`);
  const settled = await Promise.allSettled(crawlers.map(testCrawler));
  const results = settled.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    return {
      crawler: crawlers[index].storeName,
      status: "error",
      productsFound: 0,
      queryResults: [{ errorMessage: result.reason?.message || "Falha inesperada" }]
    };
  });

  console.log("\nResumo dos crawlers");
  for (const result of results) {
    const suffix = result.status === "OK"
      ? `OK, ${result.productsFound} produtos`
      : result.status;
    console.log(`${result.crawler}: ${suffix}`);

    for (const queryResult of result.queryResults.filter((item) => item.errorMessage)) {
      console.log(`  ${queryResult.query || "execucao"}: ${queryResult.errorMessage}`);
    }
  }
})().catch((error) => {
  console.error("Falha inesperada no teste dos crawlers:", error.message);
  process.exitCode = 1;
});
