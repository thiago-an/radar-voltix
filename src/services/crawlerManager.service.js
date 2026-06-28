const { env } = require("../config/env");
const { isStoreAllowed } = require("../config/stores");
const { discoverCrawlers } = require("../crawlers");
const crawlerLogRepository = require("../repositories/crawlerLog.repository");
const logger = require("../utils/logger");

function withTimeout(promise, timeoutMs, label) {
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`${label} excedeu ${timeoutMs}ms`);
      error.code = "CRAWLER_TIMEOUT";
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function classifyFailure(errorMessage) {
  const message = String(errorMessage || "");

  if (/blocked|bloquead|captcha|robot check|automated access/i.test(message)) {
    return "blocked";
  }

  if (/timeout|excedeu|timed out/i.test(message)) {
    return "timeout";
  }

  const httpStatus = message.match(/(?:HTTP\s*)?\b(401|403|404|408|409|429|500|502|503|504)\b/i);
  return httpStatus ? httpStatus[1] : "error";
}

function getQueryStatus(products, lastRun, errorMessage) {
  if (lastRun?.status && !["success", "empty", "skipped", "error"].includes(lastRun.status)) {
    return lastRun.status;
  }

  if (errorMessage || lastRun?.status === "error") {
    return classifyFailure(errorMessage || lastRun?.errorMessage);
  }

  if (lastRun?.status === "skipped") {
    return "skipped";
  }

  return products.length ? "success" : "empty";
}

function combineStatuses(queryResults) {
  if (!queryResults.length) {
    return "skipped";
  }

  const successful = queryResults.filter((result) => ["success", "empty"].includes(result.status));
  const failed = queryResults.filter((result) => !["success", "empty", "skipped"].includes(result.status));

  if (failed.length && successful.length) {
    return "partial";
  }

  if (failed.length) {
    const statuses = [...new Set(failed.map((result) => result.status))];
    return statuses.length === 1 ? statuses[0] : "error";
  }

  return queryResults.some((result) => result.productsFound > 0) ? "success" : "empty";
}

function formatDuration(durationMs) {
  const seconds = Math.max(0, Number(durationMs || 0)) / 1000;
  return seconds >= 10 ? `${Math.round(seconds)}s` : `${seconds.toFixed(1)}s`;
}

function formatSummary(runs, totalDurationMs) {
  const lines = runs.map((run) => {
    const crawler = `${run.crawler} `.padEnd(22, ".");

    if (["success", "empty"].includes(run.status)) {
      return `${crawler} OK (${run.productsFound} produtos | ${formatDuration(run.durationMs)})`;
    }

    if (run.status === "partial") {
      return `${crawler} PARCIAL (${run.productsFound} produtos | ${formatDuration(run.durationMs)})`;
    }

    if (run.status === "skipped") {
      return `${crawler} IGNORADO`;
    }

    return `${crawler} ${run.status.toUpperCase()}`;
  });

  return `${lines.join("\n")}\n\nTempo total:\n${formatDuration(totalDurationMs)}`;
}

class CrawlerManager {
  constructor(options = {}) {
    this.discover = options.discoverCrawlers || discoverCrawlers;
    this.logRepository = options.logRepository || crawlerLogRepository;
    this.logger = options.logger || logger;
    this.isApplicable = options.isApplicable || ((item, crawler) => isStoreAllowed(item, crawler.storeName));
    this.managerName = options.managerName || "Crawler Manager";
    this.entityLabel = options.entityLabel || "Crawler";
  }

  getCrawlers() {
    return this.discover();
  }

  getEnabledCrawlers() {
    return this.getCrawlers().filter((crawler) => crawler.enabled);
  }

  persistRun(run) {
    try {
      this.logRepository.create({
        crawler: run.crawler,
        query: run.queries.join(" | ") || "sem query aplicavel",
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        durationMs: run.durationMs,
        status: run.status,
        productsFound: run.productsFound,
        errorMessage: run.errorMessage
      });
    } catch (error) {
      this.logger.error(`Falha ao salvar estatisticas do crawler ${run.crawler}.`, error);
    }
  }

  async executeCrawler(crawler, watchlistItems) {
    const applicableItems = watchlistItems.filter((item) => this.isApplicable(item, crawler));
    const startedAt = new Date().toISOString();
    const startedAtMs = Date.now();
    const queryResults = [];

    for (const watchlistItem of applicableItems) {
      const queryStartedAt = Date.now();
      let products = [];
      let errorMessage = null;

      this.logger.info(`Buscando "${watchlistItem.query}" em ${crawler.storeName}.`);

      try {
        products = await withTimeout(
          Promise.resolve().then(() => crawler.search(watchlistItem.query)),
          Number(crawler.timeout || env.crawlerTimeoutMs),
          `${crawler.storeName} search`
        );

        if (!Array.isArray(products)) {
          products = [];
        }

        errorMessage = crawler.lastRun?.errorMessage || null;
      } catch (error) {
        errorMessage = error.message;
        this.logger.warn(`${this.entityLabel} ${crawler.storeName} falhou para "${watchlistItem.query}".`, error.message);
      }

      queryResults.push({
        watchlistItem,
        crawler: crawler.storeName,
        query: watchlistItem.query,
        status: getQueryStatus(products, crawler.lastRun, errorMessage),
        durationMs: Date.now() - queryStartedAt,
        productsFound: products.length,
        products,
        error: errorMessage
      });
    }

    const finishedAt = new Date().toISOString();
    const errors = queryResults
      .filter((result) => result.error)
      .map((result) => `${result.query}: ${result.error}`);
    const run = {
      crawler: crawler.storeName,
      startedAt,
      finishedAt,
      durationMs: Date.now() - startedAtMs,
      status: combineStatuses(queryResults),
      productsFound: queryResults.reduce((total, result) => total + result.productsFound, 0),
      error: errors.length ? errors.join(" | ") : null,
      errorMessage: errors.length ? errors.join(" | ") : null,
      queries: applicableItems.map((item) => item.query),
      queryResults
    };

    this.persistRun(run);
    return run;
  }

  async run(watchlistItems = []) {
    const crawlers = this.getEnabledCrawlers();
    const startedAt = new Date().toISOString();
    const startedAtMs = Date.now();
    const settled = await Promise.allSettled(
      crawlers.map((crawler) => this.executeCrawler(crawler, watchlistItems))
    );

    const runs = settled.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }

      const finishedAt = new Date().toISOString();
      const failedRun = {
        crawler: crawlers[index].storeName,
        startedAt,
        finishedAt,
        durationMs: Date.now() - startedAtMs,
        status: classifyFailure(result.reason?.message),
        productsFound: 0,
        error: result.reason?.message || "Falha inesperada no crawler.",
        errorMessage: result.reason?.message || "Falha inesperada no crawler.",
        queries: [],
        queryResults: []
      };

      this.persistRun(failedRun);
      return failedRun;
    });

    const finishedAt = new Date().toISOString();
    const totalDurationMs = Date.now() - startedAtMs;
    const summaryText = formatSummary(runs, totalDurationMs);

    this.logger.info(`Resumo do ${this.managerName}:\n${summaryText}`);

    return {
      enabledStores: crawlers.map((crawler) => crawler.storeName),
      startedAt,
      finishedAt,
      totalDurationMs,
      queryRuns: runs.reduce((total, run) => total + run.queryResults.length, 0),
      productsFound: runs.reduce((total, run) => total + run.productsFound, 0),
      runs,
      results: runs.flatMap((run) => run.queryResults),
      summaryText
    };
  }
}

const crawlerManager = new CrawlerManager();

module.exports = crawlerManager;
module.exports.CrawlerManager = CrawlerManager;
module.exports.classifyFailure = classifyFailure;
module.exports.formatSummary = formatSummary;
