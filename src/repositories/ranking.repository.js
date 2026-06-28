const { getDatabase } = require("../database/db");

function create({ source = "manual", messageSent = false, items = [] }) {
  const db = getDatabase();

  const result = db.prepare(`
    INSERT INTO daily_rankings (
      created_at,
      source,
      ranking_size,
      message_sent,
      items_json
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    new Date().toISOString(),
    source,
    items.length,
    messageSent ? 1 : 0,
    JSON.stringify(items)
  );

  return result.lastInsertRowid;
}

function getLatest() {
  const db = getDatabase();

  const row = db.prepare(`
    SELECT *
    FROM daily_rankings
    ORDER BY created_at DESC
    LIMIT 1
  `).get();

  if (!row) return null;

  return {
    id: row.id,
    createdAt: row.created_at,
    source: row.source,
    rankingSize: row.ranking_size,
    messageSent: Boolean(row.message_sent),
    items: JSON.parse(row.items_json || "[]")
  };
}

module.exports = {
  create,
  getLatest
};