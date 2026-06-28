const express = require("express");
const alertRepository = require("../repositories/alert.repository");

const router = express.Router();

router.get("/", (req, res) => {
  const limit = Number(req.query.limit || 50);

  res.json({
    data: alertRepository.list(limit)
  });
});

module.exports = router;
