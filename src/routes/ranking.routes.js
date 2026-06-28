const express = require("express");
const rankingRepository = require("../repositories/ranking.repository");

const router = express.Router();

router.get("/latest", (_req, res) => {
  res.json({
    latest: rankingRepository.getLatest()
  });
});

module.exports = router;