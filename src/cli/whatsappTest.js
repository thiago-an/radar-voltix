const { closeDatabase } = require("../database/db");
const whatsappService = require("../services/whatsapp.service");
const logger = require("../utils/logger");

(async () => {
  try {
    const text = process.argv.slice(2).join(" ") || "Teste do Radar Voltix: WhatsApp conectado.";

    whatsappService.initializeWhatsApp();
    const isReady = await whatsappService.waitUntilReady(120000);

    if (!isReady) {
      throw new Error("WhatsApp nao ficou pronto em ate 120 segundos. Confira o QR Code no terminal.");
    }

    const result = await whatsappService.sendMessage(text);
    logger.success("Teste de WhatsApp finalizado.", result);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    logger.error("Erro no teste de WhatsApp.", error);
    process.exitCode = 1;
  } finally {
    await whatsappService.shutdownWhatsApp();
    closeDatabase();
  }
})();
