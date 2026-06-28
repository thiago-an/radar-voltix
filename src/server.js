const app = require("./app");
const { env } = require("./config/env");
const { closeDatabase, initializeDatabase } = require("./database/db");
const { scheduleRadarJob } = require("./jobs/radar.job");
const watchlistRepository = require("./repositories/watchlist.repository");
const whatsappService = require("./services/whatsapp.service");
const logger = require("./utils/logger");

let server;

async function start() {
  if (server) {
    return server;
  }

  initializeDatabase();

  const seeded = watchlistRepository.seedInitialWatchlist();
  if (seeded > 0) {
    logger.info(`${seeded} itens iniciais adicionados na watchlist.`);
  }

  whatsappService.initializeWhatsApp();
  scheduleRadarJob();

  server = app.listen(env.port, () => {
    logger.success(`Radar Voltix rodando em http://localhost:${env.port}`);
  });

  return server;
}

async function stop() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }

  await whatsappService.shutdownWhatsApp();
  closeDatabase();
}

process.on("SIGINT", async () => {
  logger.info("Encerrando Radar Voltix.");
  await stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Encerrando Radar Voltix.");
  await stop();
  process.exit(0);
});

if (require.main === module) {
  start().catch((error) => {
    logger.error("Nao foi possivel iniciar o Radar Voltix.", error);
    process.exit(1);
  });
}

module.exports = {
  start,
  stop
};
