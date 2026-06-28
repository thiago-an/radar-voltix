const { env } = require("../config/env");
const { extractProductsFromHtml } = require("./productExtraction");

async function searchStorefront(crawler, query, options) {
  const url = options.url;
  const definition = options.definition;
  const parseHtml = (html, finalUrl) => extractProductsFromHtml(html, definition, finalUrl || url);
  const strategies = [];

  if (typeof options.apiSearch === "function") {
    strategies.push({
      name: "api",
      timeoutMs: options.apiTimeoutMs || env.crawlerApiTimeoutMs,
      run: options.apiSearch
    });
  }

  strategies.push(
    {
      name: "html",
      timeoutMs: options.httpTimeoutMs || env.crawlerHttpTimeoutMs,
      run: () => crawler.fetchProductsWithAxios({ url, parseHtml })
    },
    {
      name: "puppeteer",
      timeoutMs: options.browserTimeoutMs || env.crawlerBrowserTimeoutMs,
      run: () => crawler.fetchProductsWithPuppeteer({
        url,
        query,
        parseHtml,
        waitForSelector: definition.cardSelectors.join(","),
        waitMs: options.waitMs ?? 1200,
        screenshotOnEmpty: true,
        timeoutMs: options.browserTimeoutMs || env.crawlerBrowserTimeoutMs
      })
    }
  );

  return crawler.runStrategies(query, strategies);
}

module.exports = searchStorefront;
