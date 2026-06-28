const { env } = require("../config/env");
const { extractDealsFromHtml } = require("./dealSourceExtraction");

async function searchDealSource(source, query, options) {
  const urls = Array.isArray(options.urls) ? options.urls : [options.url];
  const primaryUrl = urls[0];
  const httpTimeoutMs = Math.min(env.crawlerHttpTimeoutMs, 9000);
  const parseHtml = (html, finalUrl) => extractDealsFromHtml(
    html,
    options.definition,
    finalUrl || primaryUrl,
    source.sourceName
  );
  const strategies = urls.filter(Boolean).map((url, index) => ({
    name: index === 0 ? "html" : `html-${index + 1}`,
    timeoutMs: httpTimeoutMs,
    run: () => source.fetchProductsWithAxios({ url, parseHtml, timeoutMs: httpTimeoutMs })
  }));

  strategies.push({
    name: "puppeteer",
    timeoutMs: env.crawlerBrowserTimeoutMs,
    run: () => source.fetchProductsWithPuppeteer({
      url: primaryUrl,
      query,
      parseHtml,
      waitForSelector: options.definition.cardSelectors.join(","),
      waitMs: options.waitMs ?? 1200,
      screenshotOnEmpty: true,
      timeoutMs: env.crawlerBrowserTimeoutMs
    })
  });

  return source.runStrategies(query, strategies);
}

module.exports = searchDealSource;
