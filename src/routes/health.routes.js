const express = require("express");
const radarJob = require("../jobs/radar.job");
const whatsappService = require("../services/whatsapp.service");

const router = express.Router();

router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    app: "Radar Voltix",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    whatsapp: whatsappService.getStatus(),
    radar: radarJob.getStatus()
  });
});

module.exports = router;
