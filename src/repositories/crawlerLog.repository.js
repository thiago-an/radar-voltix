const { getDatabase } = require("../database/db");

function mapCrawlerLog(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    crawler: row.crawler,
    query: row.query,
    startedAt: row.started_at || row.created_at,
    finishedAt: row.finished_at || row.created_at,
    durationMs: row.duration_ms,
    status: row.status,
    productsFound: row.products_found,
    errorMessage: row.error_message,
    createdAt: row.created_at
  };
}

function create(input) {
  const now = new Date().toISOString();
  const startedAt = input.startedAt || now;
  const finishedAt = input.finishedAt || now;
  const result = getDatabase()
    .prepare(`
      INSERT INTO crawler_logs (
        crawler,
        query,
        started_at,
        finished_at,
        status,
        products_found,
        error_message,
        duration_ms,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.crawler,
      input.query || "",
      startedAt,
      finishedAt,
      input.status,
      Number(input.productsFound || 0),
      input.errorMessage || null,
      Number(input.durationMs || 0),
      input.createdAt || finishedAt
    );

  return Number(result.lastInsertRowid);
}

function listLatest(crawlerNames = []) {
  const names = [...new Set(crawlerNames.filter(Boolean))];
  const where = names.length
    ? `WHERE crawler IN (${names.map(() => "?").join(", ")})`
    : "";
  const rows = getDatabase()
    .prepare(`
      SELECT *
      FROM crawler_logs
      WHERE id IN (
        SELECT MAX(id)
        FROM crawler_logs
        ${where}
        GROUP BY crawler
      )
      ORDER BY crawler ASC
    `)
    .all(...names);

  return rows.map(mapCrawlerLog);
}

module.exports = {
  create,
  listLatest
};
