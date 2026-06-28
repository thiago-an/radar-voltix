const express = require("express");
const historyService = require("../services/history.service");

const router = express.Router();

router.get("/", (req, res) => {
  const limit = Number(req.query.limit || 50);
  const includeHistory = req.query.includeHistory !== "false";

  res.json({
    data: historyService.listHistoryReports({
      limit,
      includeHistory
    })
  });
});

router.get("/:productHash", (req, res) => {
  const report = historyService.getProductHistoryReport(req.params.productHash);

  if (!report) {
    res.status(404).json({
      error: "Historico de produto nao encontrado."
    });
    return;
  }

  res.json(report);
});

module.exports = router;
