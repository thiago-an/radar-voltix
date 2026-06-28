const { CrawlerManager } = require("./crawlerManager.service");
const { discoverDealSources } = require("../dealSources");

const dealSourceManager = new CrawlerManager({
  discoverCrawlers: discoverDealSources,
  isApplicable: () => true,
  managerName: "Deal Source Manager",
  entityLabel: "Deal Source"
});

dealSourceManager.getSources = () => dealSourceManager.getCrawlers();
dealSourceManager.getEnabledSources = () => dealSourceManager.getEnabledCrawlers();

module.exports = dealSourceManager;
