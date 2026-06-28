const express = require("express");
const radarJob = require("../jobs/radar.job");

const router = express.Router();

router.post("/run", async (req, res, next) => {
  try {
    const summary = await radarJob.runRadarNow({
      source: "api",
      notify: req.body?.notify !== false
    });

    res.json(summary);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
