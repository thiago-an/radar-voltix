const fs = require("fs");
const path = require("path");

const SOURCE_FILE_SUFFIX = ".source.js";

function discoverDealSources() {
  return fs.readdirSync(__dirname, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(SOURCE_FILE_SUFFIX))
    .map((entry) => require(path.join(__dirname, entry.name)))
    .filter((source) => source && typeof source.search === "function" && source.sourceName)
    .sort((first, second) => first.sourceName.localeCompare(second.sourceName, "pt-BR"));
}

function getEnabledDealSources() {
  return discoverDealSources().filter((source) => source.enabled);
}

module.exports = {
  discoverDealSources,
  getEnabledDealSources
};
