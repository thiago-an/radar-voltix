const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { env } = require("../config/env");

let database;

function ensureStoragePaths() {
  fs.mkdirSync(path.dirname(env.databasePath), { recursive: true });
  fs.mkdirSync(env.logsPath, { recursive: true });
  fs.mkdirSync(env.screenshotPath, { recursive: true });
  fs.mkdirSync(env.whatsappSessionPath, { recursive: true });
}

function getDatabase() {
  ensureStoragePaths();

  if (!database) {
    database = new DatabaseSync(env.databasePath);
    database.exec("PRAGMA foreign_keys = ON;");
    database.exec("PRAGMA journal_mode = WAL;");
  }

  return database;
}

function initializeDatabase() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  migratePriceHistorySchema();
  migrateCrawlerLogsSchema();
  getDatabase().exec(schema);
  return getDatabase();
}

function getTableColumns(tableName) {
  return getDatabase()
    .prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .map((column) => column.name);
}

function migratePriceHistorySchema() {
  const columns = getTableColumns("price_history");

  if (!columns.length || columns.includes("product_hash")) {
    return;
  }

  const legacyTableName = `price_history_legacy_${Date.now()}`;
  getDatabase().exec(`ALTER TABLE price_history RENAME TO ${legacyTableName};`);
}

function migrateCrawlerLogsSchema() {
  const columns = getTableColumns("crawler_logs");

  if (!columns.length) {
    return;
  }

  const database = getDatabase();

  if (!columns.includes("started_at")) {
    database.exec("ALTER TABLE crawler_logs ADD COLUMN started_at TEXT;");
  }

  if (!columns.includes("finished_at")) {
    database.exec("ALTER TABLE crawler_logs ADD COLUMN finished_at TEXT;");
  }

  database.exec(`
    UPDATE crawler_logs
    SET
      started_at = COALESCE(started_at, created_at),
      finished_at = COALESCE(finished_at, created_at)
    WHERE started_at IS NULL OR finished_at IS NULL;
  `);
}

function closeDatabase() {
  if (database) {
    database.close();
    database = null;
  }
}

module.exports = {
  ensureStoragePaths,
  getDatabase,
  initializeDatabase,
  closeDatabase
};
