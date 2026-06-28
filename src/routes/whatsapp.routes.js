const express = require("express");
const whatsappService = require("../services/whatsapp.service");

const router = express.Router();

router.get("/status", (_req, res) => {
  res.json(whatsappService.getStatus());
});

router.post("/test", async (req, res, next) => {
  try {
    whatsappService.initializeWhatsApp();

    const ready = await whatsappService.waitUntilReady(120000);

    if (!ready) {
      return res.status(503).json({
        success: false,
        status: "not_ready",
        message: "O WhatsApp ainda está conectando. Aguarde alguns segundos e tente novamente."
      });
    }

    const text = req.body?.text || "✅ Teste enviado pelo Dashboard do Radar Voltix.";
    const result = await whatsappService.sendMessage(text);

    return res.status(result.sent ? 200 : 503).json({
      success: result.sent,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;