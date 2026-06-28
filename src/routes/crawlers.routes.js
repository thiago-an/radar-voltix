const express = require("express");
const crawlerManager = require("../services/crawlerManager.service");
const crawlerLogRepository = require("../repositories/crawlerLog.repository");

const router = express.Router();

router.get("/status", (_req, res) => {
  const crawlers = crawlerManager.getCrawlers();
  const crawlerNames = crawlers.map((crawler) => crawler.storeName);
  const enabledStores = crawlers.filter((crawler) => crawler.enabled).map((crawler) => crawler.storeName);
  const latestLogs = crawlerLogRepository.listLatest(crawlerNames);
  const latestByCrawler = new Map(latestLogs.map((log) => [log.crawler, log]));
  const stores = crawlers.map((crawler) => {
    const log = latestByCrawler.get(crawler.storeName);

    return {
      crawler: crawler.storeName,
      enabled: crawler.enabled,
      startedAt: log?.startedAt || null,
      finishedAt: log?.finishedAt || null,
      durationMs: log?.durationMs ?? null,
      status: crawler.enabled ? (log?.status || "never") : "disabled",
      productsFound: log?.productsFound || 0,
      errorMessage: log?.errorMessage || null
    };
  });
  const lastExecution = stores
    .map((store) => store.finishedAt)
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  res.json({
    enabledStores,
    lastExecution,
    stores
  });
});

module.exports = router;
