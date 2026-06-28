const express = require("express");
const { defaultMarketplace, getMarketplace, listMarketplaces } = require("../config/marketplaces");
const profitService = require("../services/profit.service");

const router = express.Router();

router.get("/simulate", (req, res, next) => {
  try {
    const marketplaceKey = req.query.marketplace || defaultMarketplace;
    const result = profitService.calculateProfit({
      purchasePrice: req.query.buy,
      sellPrice: req.query.sell,
      marketplace: marketplaceKey,
      shippingCost: req.query.shipping,
      packagingCost: req.query.packaging
    });

    res.json({
      purchasePrice: Number(req.query.buy),
      sellPrice: Number(req.query.sell),
      marketplace: getMarketplace(marketplaceKey).key,
      shippingCost: req.query.shipping === undefined || req.query.shipping === ""
        ? getMarketplace(marketplaceKey).averageShipping
        : Number(req.query.shipping),
      packagingCost: Number(req.query.packaging || 0),
      ...result
    });
  } catch (error) {
    next(error);
  }
});

router.get("/top", (req, res, next) => {
  try {
    res.json({
      data: profitService.listTopProfitsToday(req.query.limit, {
        marketplace: req.query.marketplace || defaultMarketplace
      })
    });
  } catch (error) {
    next(error);
  }
});

router.get("/marketplaces", (_req, res) => {
  res.json({
    defaultMarketplace,
    data: listMarketplaces()
  });
});

module.exports = router;
