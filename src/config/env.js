const path = require("path");
const dotenv = require("dotenv");

const rootDir = path.resolve(__dirname, "..", "..");

dotenv.config({ path: path.join(rootDir, ".env"), quiet: true });

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBool(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "y", "sim"].includes(String(value).toLowerCase());
}

function resolveFromRoot(value, fallback) {
  const selected = value || fallback;
  return path.isAbsolute(selected) ? selected : path.resolve(rootDir, selected);
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 3000),
  whatsappTargetNumber: process.env.WHATSAPP_TARGET_NUMBER || "",
  radarIntervalMinutes: toNumber(process.env.RADAR_INTERVAL_MINUTES, 30),
  headless: toBool(process.env.HEADLESS, true),
  minScoreToAlert: toNumber(process.env.MIN_SCORE_TO_ALERT, 70),
  databasePath: resolveFromRoot(process.env.DATABASE_PATH, "./storage/radar.sqlite"),
  whatsappSessionPath: resolveFromRoot(process.env.WHATSAPP_SESSION_PATH, "./storage/sessions"),
  screenshotPath: resolveFromRoot(process.env.SCREENSHOT_PATH, "./storage/screenshots"),
  logsPath: resolveFromRoot(process.env.LOGS_PATH, "./storage/logs"),
  crawlerTimeoutMs: toNumber(process.env.CRAWLER_TIMEOUT_MS, 45000),
  crawlerApiTimeoutMs: toNumber(process.env.CRAWLER_API_TIMEOUT_MS, 8000),
  crawlerHttpTimeoutMs: toNumber(process.env.CRAWLER_HTTP_TIMEOUT_MS, 12000),
  crawlerBrowserTimeoutMs: toNumber(process.env.CRAWLER_BROWSER_TIMEOUT_MS, 22000),
  maxProductsPerCrawler: toNumber(process.env.MAX_PRODUCTS_PER_CRAWLER, 10),
  maxProductsPerDealSource: toNumber(process.env.MAX_PRODUCTS_PER_DEAL_SOURCE, 10),
  dailyRankingLimit: toNumber(process.env.DAILY_RANKING_LIMIT, 5),
  minRankingScore: toNumber(process.env.MIN_RANKING_SCORE, 75),
  sendIndividualAlerts: toBool(process.env.SEND_INDIVIDUAL_ALERTS, false),
  ignoreDuplicates: toBool(process.env.IGNORE_DUPLICATES, false)
};

module.exports = {
  env,
  rootDir,
  toBool,
  toNumber
};
