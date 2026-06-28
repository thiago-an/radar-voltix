const fs = require("fs");
const path = require("path");

const CRAWLER_FILE_SUFFIX = ".crawler.js";

function discoverCrawlers() {
  return fs.readdirSync(__dirname, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(CRAWLER_FILE_SUFFIX))
    .map((entry) => require(path.join(__dirname, entry.name)))
    .filter((crawler) => crawler && typeof crawler.search === "function" && crawler.storeName)
    .sort((first, second) => first.storeName.localeCompare(second.storeName, "pt-BR"));
}

function getEnabledCrawlers() {
  return discoverCrawlers().filter((crawler) => crawler.enabled);
}

const exported = {
  discoverCrawlers,
  getEnabledCrawlers
};

Object.defineProperty(exported, "crawlers", {
  enumerable: true,
  get: discoverCrawlers
});

module.exports = exported;
