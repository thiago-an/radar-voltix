const express = require("express");
const marketplaceAdvisorService = require("../services/marketplaceAdvisor.service");

const router = express.Router();

router.get("/:productId", (req, res, next) => {
  try {
    res.json(marketplaceAdvisorService.compareProductById(req.params.productId));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
