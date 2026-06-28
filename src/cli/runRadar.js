const { closeDatabase } = require("../database/db");
const { runRadar } = require("../services/radar.service");
const whatsappService = require("../services/whatsapp.service");
const logger = require("../utils/logger");

(async () => {
  try {
    const summary = await runRadar({ source: "cli" });
    logger.success("Execucao manual do radar concluida.", summary);
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    logger.error("Erro na execucao manual do radar.", error);
    process.exitCode = 1;
  } finally {
    await whatsappService.shutdownWhatsApp();
    closeDatabase();
  }
})();
