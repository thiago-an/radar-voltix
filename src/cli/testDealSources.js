const { getEnabledDealSources } = require("../dealSources");

const QUERIES = ["mouse gamer", "ssd nvme 1tb", "notebook ryzen 5"];

function selectStatus(statuses, productsFound) {
  if (productsFound > 0) {
    return "OK";
  }

  return ["blocked", "403", "429", "timeout", "error", "empty"]
    .find((status) => statuses.includes(status)) || "empty";
}

async function testSource(source) {
  const queryResults = [];

  for (const query of QUERIES) {
    const products = await source.search(query);
    queryResults.push({
      query,
      status: source.lastRun?.status || (products.length ? "success" : "empty"),
      productsFound: products.length,
      errorMessage: source.lastRun?.errorMessage || null
    });
  }

  const productsFound = queryResults.reduce((total, result) => total + result.productsFound, 0);
  return {
    source: source.sourceName,
    status: selectStatus(queryResults.map((result) => result.status), productsFound),
    productsFound,
    queryResults
  };
}

(async () => {
  const sources = getEnabledDealSources();

  if (!sources.length) {
    console.log("Nenhuma Deal Source habilitada no .env.");
    return;
  }

  console.log(`Testando ${sources.length} Deal Sources com ${QUERIES.length} consultas...\n`);
  const settled = await Promise.allSettled(sources.map(testSource));
  const results = settled.map((result, index) => result.status === "fulfilled"
    ? result.value
    : {
        source: sources[index].sourceName,
        status: "error",
        productsFound: 0,
        queryResults: [{ errorMessage: result.reason?.message || "Falha inesperada" }]
      });

  console.log("\nResumo das Deal Sources");
  for (const result of results) {
    console.log(`${result.source}: ${result.status === "OK" ? `OK, ${result.productsFound} produtos` : result.status}`);
    for (const queryResult of result.queryResults.filter((item) => item.errorMessage)) {
      console.log(`  ${queryResult.query || "execucao"}: ${queryResult.errorMessage}`);
    }
  }
})().catch((error) => {
  console.error("Falha inesperada no teste das Deal Sources:", error.message);
  process.exitCode = 1;
});
