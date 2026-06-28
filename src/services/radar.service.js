const { env } = require("../config/env");
const { defaultMarketplace, getMarketplace } = require("../config/marketplaces");
const { isStoreAllowed } = require("../config/stores");
const { initializeDatabase } = require("../database/db");
const alertRepository = require("../repositories/alert.repository");
const watchlistRepository = require("../repositories/watchlist.repository");
const crawlerManager = require("./crawlerManager.service");
const dealSourceManager = require("./dealSourceManager.service");
const duplicateService = require("./duplicate.service");
const historyService = require("./history.service");
const inventoryService = require("./inventory.service");
const marketplaceAdvisorService = require("./marketplaceAdvisor.service");
const opportunityService = require("./opportunity.service");
const priceService = require("./price.service");
const productNormalizer = require("./productNormalizer");
const dailyRankingService = require("./dailyRanking.service");
const whatsappService = require("./whatsapp.service");
const logger = require("../utils/logger");
const rankingRepository = require("../repositories/ranking.repository");

async function processProduct(rawProduct, watchlistItem, crawlerName, summary, options) {
  if (!isStoreAllowed(watchlistItem, rawProduct.store || crawlerName)) {
    return;
  }

  const normalizedProduct = productNormalizer.normalizeProduct({
    ...rawProduct,
    watchlistId: watchlistItem.id,
    crawler: crawlerName,
    store: rawProduct.store || crawlerName,
    url: rawProduct.url || rawProduct.link
  });

  const historyResult = historyService.savePrice(normalizedProduct);

  if (historyResult.saved) {
    summary.historyRecordsSaved += 1;
  } else if (historyResult.duplicate) {
    summary.historyDuplicatesSkipped += 1;
  }

  const product = priceService.recordProductSnapshot(normalizedProduct);
  const productTitle = String(product.title || "").toLowerCase();
const watchQuery = String(watchlistItem.query || watchlistItem.name || "").toLowerCase();

const queryWords = watchQuery
  .split(/\s+/)
  .filter((word) => word.length >= 3);

const matchedWords = queryWords.filter((word) => productTitle.includes(word));

const relevance = queryWords.length
  ? matchedWords.length / queryWords.length
  : 0;

if (relevance < 0.6) {
  summary.alertsSkipped += 1;
  logger.info(`Produto ignorado por baixa relevância: ${product.title}`, {
    watchlist: watchlistItem.name,
    query: watchlistItem.query,
    relevance
  });
  return;
}
  const opportunity = opportunityService.calculateOpportunity(product, watchlistItem);

  if (opportunity.score < env.minScoreToAlert) {
    return;
  }

  summary.opportunitiesFound += 1;
  summary.profitEvaluations += 1;

  const marketplaceComparison = marketplaceAdvisorService.compareMarketplaces({
    ...product,
    expectedSellPrice: watchlistItem.expectedSellPrice,
    packagingCost: watchlistItem.packagingCost
  });

  const bestMarketplace = marketplaceComparison[0];
  const marketplaceKey =
    bestMarketplace?.marketplaceKey ||
    watchlistItem.marketplace ||
    defaultMarketplace;

  const profit = {
    grossProfit: bestMarketplace?.grossProfit || 0,
    netProfit: bestMarketplace?.netProfit || 0,
    roi: bestMarketplace?.roi || 0,
    totalFees: bestMarketplace?.totalFees || 0,
    recommended: Boolean(bestMarketplace?.recommended)
  };

  if (!profit.recommended) {
    summary.profitRejected += 1;
    summary.alertsSkipped += 1;

    logger.info(`Alerta ignorado pelo Profit Engine: ${product.title}`, {
      marketplace: getMarketplace(marketplaceKey).name,
      netProfit: profit.netProfit,
      roi: profit.roi
    });

    return;
  }

  summary.profitableOpportunities += 1;

  const inventory = inventoryService.getStockForProduct(product, watchlistItem);

const duplicateCheck = duplicateService.shouldSendAlert(product, watchlistItem);

if (!duplicateCheck.shouldSend && !options.ignoreDuplicates) {
  summary.alertsSkipped += 1;
  logger.info(
    `Alerta ignorado por anti-duplicacao: ${product.title}`,
    duplicateCheck.reason
  );
  return;
}

  if (!options.notify) {
    summary.alertsSkipped += 1;
    logger.info(`Alerta encontrado sem envio automatico: ${product.title}`);
    return;
  }

  summary.rankingCandidates.push({
    product,
    watchlistItem,
    opportunity,
    profit,
    marketplace: getMarketplace(marketplaceKey),
    inventory,
    marketplaceComparison,
    duplicateHash: duplicateCheck.hash,

    title: product.title,
    store: product.store,
    price: product.price,
    link: product.link,
    score: opportunity.score,
    recommendation: opportunity.recommendation,
    expectedSellPrice: watchlistItem.expectedSellPrice,
    netProfit: profit.netProfit,
    roi: profit.roi,
    priority: watchlistItem.priority
  });
}

async function runRadar(options = {}) {
 const settings = {
  source: options.source || "manual",
  notify: options.notify !== false,
  ignoreDuplicates: options.ignoreDuplicates === true || env.ignoreDuplicates
};

  initializeDatabase();

  const seeded = watchlistRepository.seedInitialWatchlist();

  if (seeded > 0) {
    logger.info(`${seeded} itens iniciais adicionados na watchlist.`);
  }

  const watchlistItems = watchlistRepository.list();

  const summary = {
    source: settings.source,
    notify: settings.notify,
    startedAt: new Date().toISOString(),
    finishedAt: null,

    watchlistItems: watchlistItems.length,
    crawlerRuns: 0,
    dealSourceRuns: 0,
    productsFound: 0,

    historyRecordsSaved: 0,
    historyDuplicatesSkipped: 0,

    opportunitiesFound: 0,
    profitEvaluations: 0,
    profitableOpportunities: 0,
    profitRejected: 0,

    alertsSent: 0,
    alertsSkipped: 0,

    rankingCandidates: [],
    rankingSent: false,
    rankingSize: 0,

    crawlerDurationMs: 0,
    dealSourceDurationMs: 0,
    acquisitionDurationMs: 0,

    crawlers: [],
    dealSources: [],
    crawlerSummary: "",
    dealSourceSummary: "",

    errors: []
  };

  logger.info(
    `Radar iniciado por ${settings.source}. Itens monitorados: ${watchlistItems.length}.`
  );

  const acquisitionStartedAt = Date.now();

  const [crawlerResult, dealSourceResult] = await Promise.allSettled([
    crawlerManager.run(watchlistItems),
    dealSourceManager.run(watchlistItems)
  ]);

  const emptyExecution = {
    queryRuns: 0,
    productsFound: 0,
    totalDurationMs: 0,
    summaryText: "",
    runs: [],
    results: []
  };

  const crawlerExecution =
    crawlerResult.status === "fulfilled" ? crawlerResult.value : emptyExecution;

  const dealSourceExecution =
    dealSourceResult.status === "fulfilled" ? dealSourceResult.value : emptyExecution;

  if (crawlerResult.status === "rejected") {
    summary.errors.push({
      type: "crawler_manager",
      status: "error",
      error:
        crawlerResult.reason?.message ||
        "Falha inesperada no Crawler Manager."
    });
  }

  if (dealSourceResult.status === "rejected") {
    summary.errors.push({
      type: "deal_source_manager",
      status: "error",
      error:
        dealSourceResult.reason?.message ||
        "Falha inesperada no Deal Source Manager."
    });
  }

  summary.crawlerRuns = crawlerExecution.queryRuns;
  summary.dealSourceRuns = dealSourceExecution.queryRuns;
  summary.productsFound =
    crawlerExecution.productsFound + dealSourceExecution.productsFound;

  summary.crawlerDurationMs = crawlerExecution.totalDurationMs;
  summary.dealSourceDurationMs = dealSourceExecution.totalDurationMs;
  summary.acquisitionDurationMs = Date.now() - acquisitionStartedAt;

  summary.crawlerSummary = crawlerExecution.summaryText;
  summary.dealSourceSummary = dealSourceExecution.summaryText;

  summary.crawlers = crawlerExecution.runs.map((run) => ({
    crawler: run.crawler,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    durationMs: run.durationMs,
    status: run.status,
    productsFound: run.productsFound,
    error: run.error
  }));

  summary.dealSources = dealSourceExecution.runs.map((run) => ({
    source: run.crawler.replace(/^Deal Source:\s*/i, ""),
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    durationMs: run.durationMs,
    status: run.status,
    productsFound: run.productsFound,
    error: run.error
  }));

  crawlerExecution.runs
    .filter((run) => !["success", "empty", "skipped"].includes(run.status))
    .forEach((run) => {
      summary.errors.push({
        crawler: run.crawler,
        status: run.status,
        error: run.error
      });
    });

  dealSourceExecution.runs
    .filter((run) => !["success", "empty", "skipped"].includes(run.status))
    .forEach((run) => {
      summary.errors.push({
        source: run.crawler.replace(/^Deal Source:\s*/i, ""),
        status: run.status,
        error: run.error
      });
    });

  for (const result of [...crawlerExecution.results, ...dealSourceExecution.results]) {
    for (const product of result.products) {
      try {
        await processProduct(
          product,
          result.watchlistItem,
          result.crawler,
          summary,
          settings
        );
      } catch (error) {
        logger.error(`Erro ao processar produto de ${result.crawler}.`, error);

        summary.errors.push({
          crawler: result.crawler,
          product: product.title,
          error: error.message
        });
      }
    }
  }

  if (settings.notify && summary.rankingCandidates.length) {
    const ranking = dailyRankingService
  .buildDailyRanking(summary.rankingCandidates, env.dailyRankingLimit)
  .filter((item) => item.rankingScore >= env.minRankingScore);
  rankingRepository.create({
  source: settings.source,
  messageSent: false,
  items: ranking.map((item) => ({
    title: item.product.title,
    store: item.product.store,
    price: item.product.price,
    link: item.product.link,
    score: item.rankingScore,
    netProfit: item.profit?.netProfit,
    roi: item.profit?.roi,
    recommendation: item.opportunity?.recommendation,
    priceIntelligence: item.priceIntelligence
  }))
});

    const message = dailyRankingService.formatDailyRankingMessage(ranking);

    const sendResult = await whatsappService.sendMessage(message);

    summary.rankingSize = ranking.length;

    if (sendResult.sent) {
      summary.rankingSent = true;
      summary.alertsSent = 1;

      for (const item of ranking) {
        alertRepository.create({
          watchlistId: item.watchlistItem.id,
          productId: item.product.id,
          productTitle: item.product.title,
          store: item.product.store,
          price: item.product.price,
          link: item.product.link,
          score: item.opportunity.score,
          recommendation: item.opportunity.recommendation,
          hash: item.duplicateHash
        });
      }

      logger.success(`Ranking diario enviado com ${ranking.length} oportunidades.`);
    } else {
      summary.alertsSkipped += ranking.length;
      logger.warn("Ranking diario nao enviado.", sendResult.reason);
    }
  }

  summary.finishedAt = new Date().toISOString();

  logger.success(
    `Radar finalizado. Produtos: ${summary.productsFound}. Oportunidades: ${summary.opportunitiesFound}. Ranking: ${summary.rankingSize}. Mensagens enviadas: ${summary.alertsSent}.`
  );

  return summary;
}

module.exports = {
  runRadar
};