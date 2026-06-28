const fs = require("fs");
const path = require("path");
const axios = require("axios");
const puppeteer = require("puppeteer");
const { env } = require("../config/env");
const { parseMoney } = require("../utils/money");
const { cleanProductTitle, slugify } = require("../utils/text");
const sleep = require("../utils/sleep");
const logger = require("../utils/logger");

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
];

function withTimeout(promise, timeoutMs, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`${label} excedeu ${timeoutMs}ms`);
      error.code = "CRAWLER_TIMEOUT";
      error.status = "timeout";
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function classifyCrawlerError(error) {
  if (error?.status) {
    return String(error.status);
  }

  if (error?.code === "BLOCKED" || /blocked|bloquead|captcha|robot check/i.test(String(error?.message))) {
    return "blocked";
  }

  if (error?.code === "CRAWLER_TIMEOUT" || /timeout|excedeu|timed out/i.test(String(error?.message))) {
    return "timeout";
  }

  const statusCode = error?.statusCode || error?.response?.status;
  if (Number.isInteger(statusCode)) {
    return String(statusCode);
  }

  const match = String(error?.message || "").match(/(?:HTTP\s*)?\b([45]\d{2})\b/i);
  return match ? match[1] : "error";
}

function enrichError(error, context = {}) {
  const selected = error instanceof Error ? error : new Error(String(error || "Falha desconhecida"));
  const statusCode = selected.statusCode || selected.response?.status;

  if (Number.isInteger(statusCode)) {
    selected.statusCode = statusCode;
    selected.status = String(statusCode);
    if (!/\b[45]\d{2}\b/.test(selected.message)) {
      selected.message = `HTTP ${statusCode}: ${selected.message}`;
    }
  }

  Object.assign(selected, context);
  return selected;
}

function selectProductPrice(rawProduct) {
  const preferred = [rawProduct.pixPrice, rawProduct.cashPrice, rawProduct.spotPrice]
    .flat()
    .map(parseMoney)
    .filter((value) => Number.isFinite(value) && value > 0);

  if (preferred.length) {
    return Math.min(...preferred);
  }

  const regular = [rawProduct.price].flat()
    .map(parseMoney)
    .filter((value) => Number.isFinite(value) && value > 0);

  return regular.length ? Math.min(...regular) : null;
}

class BaseCrawler {
  constructor(options = {}) {
    this.storeName = options.storeName;
    this.enabled = options.enabled !== false;
    this.timeout = options.timeout || env.crawlerTimeoutMs;
    this.maxResults = options.maxResults || env.maxProductsPerCrawler;
    this.lastRun = null;
    this.lastStrategyReport = [];
  }

  getUserAgent() {
    const index = Math.abs(this.storeName.length + new Date().getDate()) % USER_AGENTS.length;
    return USER_AGENTS[index];
  }

  buildHeaders(url, extraHeaders = {}) {
    let origin;
    try {
      origin = new URL(url).origin;
    } catch (_error) {
      origin = undefined;
    }

    return {
      Accept: "text/html,application/xhtml+xml,application/json;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.7,en;q=0.6",
      "Cache-Control": "no-cache",
      DNT: "1",
      Pragma: "no-cache",
      Referer: origin ? `${origin}/` : undefined,
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": this.getUserAgent(),
      ...extraHeaders
    };
  }

  async search(query) {
    const startedAtMs = Date.now();
    const startedAt = new Date().toISOString();
    this.lastStrategyReport = [];

    if (!this.enabled) {
      this.lastRun = {
        status: "skipped",
        productsFound: 0,
        durationMs: 0,
        errorMessage: "Crawler desativado",
        startedAt,
        finishedAt: startedAt,
        strategies: []
      };
      return [];
    }

    try {
      const rawProducts = await withTimeout(
        Promise.resolve().then(() => this.performSearch(query)),
        this.timeout,
        `${this.storeName} search`
      );
      const products = (Array.isArray(rawProducts) ? rawProducts : [])
        .map((rawProduct) => this.normalizeProduct(rawProduct))
        .filter(Boolean)
        .slice(0, this.maxResults);

      this.lastRun = {
        status: products.length ? "success" : "empty",
        productsFound: products.length,
        durationMs: Date.now() - startedAtMs,
        errorMessage: null,
        startedAt,
        finishedAt: new Date().toISOString(),
        strategy: this.lastStrategyReport.find((item) => item.status === "success")?.name || null,
        strategies: this.lastStrategyReport
      };

      if (!products.length) {
        logger.warn(`${this.storeName} retornou 0 produtos para "${query}".`, {
          strategies: this.lastStrategyReport
        });
      }

      return products;
    } catch (caughtError) {
      const error = enrichError(caughtError);
      const status = classifyCrawlerError(error);
      this.lastRun = {
        status,
        productsFound: 0,
        durationMs: Date.now() - startedAtMs,
        errorMessage: error.message,
        startedAt,
        finishedAt: new Date().toISOString(),
        strategies: error.strategyErrors || this.lastStrategyReport
      };

      logger.warn(`${this.storeName} falhou para "${query}". Continuando para a proxima loja.`, {
        status,
        error: error.message,
        strategies: this.lastRun.strategies
      });
      return [];
    }
  }

  async performSearch() {
    return [];
  }

  normalizeProduct(rawProduct) {
    if (!rawProduct || typeof rawProduct !== "object") {
      return null;
    }

    const raw = rawProduct.raw && typeof rawProduct.raw === "object"
      ? rawProduct.raw
      : { ...rawProduct };
    const title = cleanProductTitle(rawProduct.title);
    const price = selectProductPrice(rawProduct);
    const oldPriceCandidate = parseMoney(rawProduct.oldPrice);
    const oldPrice = Number.isFinite(oldPriceCandidate) && oldPriceCandidate > price
      ? oldPriceCandidate
      : null;

    if (!title || !Number.isFinite(price)) {
      return null;
    }

    return {
      title,
      price,
      oldPrice,
      link: rawProduct.link || rawProduct.url || null,
      image: rawProduct.image || null,
      store: rawProduct.store || this.storeName,
      availability: rawProduct.availability || "unknown",
      raw
    };
  }

  selectStrategyFailure(failures) {
    return failures.find((failure) => failure.status === "blocked")
      || failures.find((failure) => failure.status === "403")
      || failures.find((failure) => failure.status === "429")
      || failures.at(-1);
  }

  async runStrategies(query, strategies = []) {
    const failures = [];
    this.lastStrategyReport = [];

    for (const strategy of strategies) {
      if (!strategy || strategy.enabled === false || typeof strategy.run !== "function") {
        continue;
      }

      const startedAt = Date.now();
      const timeoutMs = Number(strategy.timeoutMs || env.crawlerHttpTimeoutMs);
      logger.info(`${this.storeName}: tentando camada ${strategy.name} para "${query}".`);

      try {
        const result = await withTimeout(
          Promise.resolve().then(() => strategy.run()),
          timeoutMs,
          `${this.storeName} ${strategy.name}`
        );
        const products = Array.isArray(result) ? result : [];
        const report = {
          name: strategy.name,
          status: products.length ? "success" : "empty",
          productsFound: products.length,
          durationMs: Date.now() - startedAt,
          errorMessage: null
        };
        this.lastStrategyReport.push(report);

        if (products.length) {
          logger.info(`${this.storeName}: camada ${strategy.name} encontrou ${products.length} produtos.`);
          return products;
        }

        logger.warn(`${this.storeName}: camada ${strategy.name} retornou 0 produtos.`);
      } catch (caughtError) {
        const error = enrichError(caughtError, { strategy: strategy.name });
        const failure = {
          name: strategy.name,
          status: classifyCrawlerError(error),
          productsFound: 0,
          durationMs: Date.now() - startedAt,
          errorMessage: error.message
        };
        failures.push(failure);
        this.lastStrategyReport.push(failure);
        logger.warn(`${this.storeName}: camada ${strategy.name} falhou; tentando a proxima.`, failure);
      }
    }

    if (failures.length) {
      const selectedFailure = this.selectStrategyFailure(failures);
      const error = new Error(selectedFailure.errorMessage);
      error.status = selectedFailure.status;
      error.code = selectedFailure.status === "blocked" ? "BLOCKED" : undefined;
      error.strategyErrors = this.lastStrategyReport;
      throw error;
    }

    return [];
  }

  async fetchJson(options) {
    try {
      const response = await axios.get(options.url, {
        headers: this.buildHeaders(options.url, {
          Accept: "application/json, text/plain, */*",
          ...(options.headers || {})
        }),
        params: options.params,
        timeout: options.timeoutMs || env.crawlerApiTimeoutMs,
        maxRedirects: 5,
        maxContentLength: 10 * 1024 * 1024,
        validateStatus: (status) => status >= 200 && status < 400
      });

      return response.data;
    } catch (error) {
      const enriched = enrichError(error, { url: options.url });
      if (enriched.statusCode) {
        enriched.message = `HTTP ${enriched.statusCode} em ${options.url}`;
      }
      throw enriched;
    }
  }

  async fetchHtml(options) {
    try {
      const response = await axios.get(options.url, {
        headers: this.buildHeaders(options.url, options.headers),
        timeout: options.timeoutMs || env.crawlerHttpTimeoutMs,
        responseType: "text",
        maxRedirects: 5,
        maxContentLength: 12 * 1024 * 1024,
        validateStatus: (status) => status >= 200 && status < 400
      });

      return {
        html: String(response.data || ""),
        url: response.request?.res?.responseUrl || options.url,
        statusCode: response.status
      };
    } catch (error) {
      const enriched = enrichError(error, { url: options.url });
      if (enriched.statusCode) {
        enriched.message = `HTTP ${enriched.statusCode} em ${options.url}`;
      }
      throw enriched;
    }
  }

  async fetchProductsWithAxios(options) {
    const response = await this.fetchHtml(options);
    return options.parseHtml(response.html, response.url);
  }

  async fetchProductsWithPuppeteer(options) {
    let browser;
    let page;

    try {
      browser = await puppeteer.launch({
        headless: env.headless,
        timeout: options.timeoutMs || env.crawlerBrowserTimeoutMs,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-features=site-per-process",
          "--disable-blink-features=AutomationControlled",
          "--lang=pt-BR"
        ]
      });
      page = await browser.newPage();
      const timeoutMs = options.timeoutMs || env.crawlerBrowserTimeoutMs;
      page.setDefaultNavigationTimeout(timeoutMs);
      page.setDefaultTimeout(timeoutMs);
      await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });
      await page.setUserAgent(this.getUserAgent());
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        Object.defineProperty(navigator, "languages", { get: () => ["pt-BR", "pt", "en-US"] });
        Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      });
      await page.setExtraHTTPHeaders({
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.7,en;q=0.6",
        DNT: "1"
      });
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        if (["font", "media"].includes(request.resourceType())) {
          request.abort().catch(() => {});
          return;
        }
        request.continue().catch(() => {});
      });

      const response = await page.goto(options.url, {
        waitUntil: options.waitUntil || "domcontentloaded",
        timeout: timeoutMs
      });
      const statusCode = response?.status();
      if (statusCode >= 400) {
        const error = new Error(`HTTP ${statusCode} em ${options.url}`);
        error.statusCode = statusCode;
        throw error;
      }

      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: Math.min(timeoutMs, options.selectorTimeoutMs || 8000)
        }).catch(() => {});
      }

      if (options.waitMs) {
        await sleep(options.waitMs);
      }

      const html = await page.content();
      const products = options.parseHtml(html, page.url());

      if (!products.length && options.screenshotOnEmpty) {
        await this.saveErrorScreenshot(page, `${options.query}-empty`);
      }

      return products;
    } catch (caughtError) {
      const error = enrichError(caughtError);
      if (page && !page.isClosed()) {
        error.screenshot = await this.saveErrorScreenshot(page, options.query);
      }
      throw error;
    } finally {
      if (page && !page.isClosed()) {
        await page.close().catch(() => {});
      }
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  async saveErrorScreenshot(page, query) {
    try {
      fs.mkdirSync(env.screenshotPath, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${slugify(this.storeName)}-${slugify(query)}-${timestamp}.png`;
      const destination = path.join(env.screenshotPath, filename);
      try {
        await page.screenshot({ path: destination, fullPage: true });
      } catch (_fullPageError) {
        await page.screenshot({ path: destination, fullPage: false });
      }
      logger.warn(`Screenshot de erro salvo para ${this.storeName}.`, destination);
      return destination;
    } catch (error) {
      logger.warn(`Nao foi possivel salvar screenshot de erro em ${this.storeName}.`, error.message);
      return null;
    }
  }
}

module.exports = BaseCrawler;
module.exports.classifyCrawlerError = classifyCrawlerError;
module.exports.selectProductPrice = selectProductPrice;
module.exports.withTimeout = withTimeout;
