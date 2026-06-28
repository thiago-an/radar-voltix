const express = require("express");
const dealSourceManager = require("../services/dealSourceManager.service");
const crawlerLogRepository = require("../repositories/crawlerLog.repository");

const router = express.Router();

router.get("/status", (_req, res) => {
  const sources = dealSourceManager.getSources();
  const logNames = sources.map((source) => source.storeName);
  const latestLogs = crawlerLogRepository.listLatest(logNames);
  const latestBySource = new Map(latestLogs.map((log) => [log.crawler, log]));
  const status = sources.map((source) => {
    const log = latestBySource.get(source.storeName);

    return {
      source: source.sourceName,
      crawler: source.sourceName,
      enabled: source.enabled,
      startedAt: log?.startedAt || null,
      finishedAt: log?.finishedAt || null,
      durationMs: log?.durationMs ?? null,
      status: source.enabled ? (log?.status || "never") : "disabled",
      productsFound: log?.productsFound || 0,
      errorMessage: log?.errorMessage || null
    };
  });
  const lastExecution = status
    .map((source) => source.finishedAt)
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  res.json({
    enabledSources: sources.filter((source) => source.enabled).map((source) => source.sourceName),
    lastExecution,
    sources: status
  });
});

module.exports = router;
