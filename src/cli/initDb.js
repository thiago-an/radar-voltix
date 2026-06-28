const { closeDatabase, initializeDatabase } = require("../database/db");
const watchlistRepository = require("../repositories/watchlist.repository");
const logger = require("../utils/logger");

try {
  initializeDatabase();
  const seeded = watchlistRepository.seedInitialWatchlist();
  logger.success(`Banco inicializado. Itens novos na watchlist: ${seeded}.`);
} catch (error) {
  logger.error("Erro ao inicializar banco.", error);
  process.exitCode = 1;
} finally {
  closeDatabase();
}
