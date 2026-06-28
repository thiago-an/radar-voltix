const { getDatabase } = require("../database/db");

function mapHistory(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    watchlistId: row.watchlist_id,
    crawler: row.crawler,
    productTitle: row.product_title,
    normalizedTitle: row.normalized_title,
    productHash: row.product_hash,
    price: row.price,
    oldPrice: row.old_price,
    availability: row.availability,
    url: row.url,
    image: row.image,
    capturedAt: row.captured_at
  };
}

function create(input) {
  const capturedAt = input.capturedAt || new Date().toISOString();
  const result = getDatabase()
    .prepare(`
      INSERT INTO price_history (
        watchlist_id,
        crawler,
        product_title,
        normalized_title,
        product_hash,
        price,
        old_price,
        availability,
        url,
        image,
        captured_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.watchlistId || null,
      input.crawler,
      input.productTitle,
      input.normalizedTitle,
      input.productHash,
      input.price,
      input.oldPrice ?? null,
      input.availability || "unknown",
      input.url || null,
      input.image || null,
      capturedAt
    );

  return findById(Number(result.lastInsertRowid));
}

function findById(id) {
  const row = getDatabase()
    .prepare("SELECT * FROM price_history WHERE id = ?")
    .get(Number(id));

  return mapHistory(row);
}

function findRecentSamePrice(productHash, price, minutes = 30) {
  const row = getDatabase()
    .prepare(`
      SELECT *
      FROM price_history
      WHERE product_hash = ?
        AND price = ?
        AND julianday(captured_at) >= julianday('now', ?)
      ORDER BY captured_at DESC
      LIMIT 1
    `)
    .get(productHash, Number(price), `-${Number(minutes)} minutes`);

  return mapHistory(row);
}

function getHistory(productHash) {
  return getDatabase()
    .prepare(`
      SELECT *
      FROM price_history
      WHERE product_hash = ?
      ORDER BY captured_at DESC
    `)
    .all(productHash)
    .map(mapHistory);
}

function getLowestPrice(productHash) {
  const row = getDatabase()
    .prepare("SELECT MIN(price) AS value FROM price_history WHERE product_hash = ?")
    .get(productHash);

  return row?.value ?? null;
}

function getAveragePrice(productHash) {
  const row = getDatabase()
    .prepare("SELECT AVG(price) AS value FROM price_history WHERE product_hash = ?")
    .get(productHash);

  return row?.value ?? null;
}

function getHighestPrice(productHash) {
  const row = getDatabase()
    .prepare("SELECT MAX(price) AS value FROM price_history WHERE product_hash = ?")
    .get(productHash);

  return row?.value ?? null;
}

function getLastSeen(productHash) {
  const row = getDatabase()
    .prepare(`
      SELECT *
      FROM price_history
      WHERE product_hash = ?
      ORDER BY captured_at DESC
      LIMIT 1
    `)
    .get(productHash);

  return mapHistory(row);
}

function findLatestByNormalizedTitle(normalizedTitle) {
  const row = getDatabase()
    .prepare(`
      SELECT *
      FROM price_history
      WHERE normalized_title = ?
      ORDER BY captured_at DESC, id DESC
      LIMIT 1
    `)
    .get(normalizedTitle);

  return mapHistory(row);
}

function getSummary(productHash) {
  const row = getDatabase()
    .prepare(`
      SELECT
        product_hash,
        product_title,
        normalized_title,
        COUNT(*) AS records_count,
        MIN(price) AS lowest_price,
        MAX(price) AS highest_price,
        AVG(price) AS average_price,
        MAX(captured_at) AS last_seen_at
      FROM price_history
      WHERE product_hash = ?
      GROUP BY product_hash
    `)
    .get(productHash);

  if (!row) {
    return null;
  }

  const lastSeen = getLastSeen(productHash);

  return {
    productHash: row.product_hash,
    productTitle: lastSeen?.productTitle || row.product_title,
    normalizedTitle: row.normalized_title,
    lastPrice: lastSeen?.price ?? null,
    lowestPrice: row.lowest_price,
    highestPrice: row.highest_price,
    averagePrice: row.average_price,
    recordsCount: row.records_count,
    lastSeen
  };
}

function listSummaries(options = {}) {
  const limit = Number(options.limit || 50);

  return getDatabase()
    .prepare(`
      SELECT
        product_hash,
        MAX(captured_at) AS last_seen_at
      FROM price_history
      GROUP BY product_hash
      ORDER BY last_seen_at DESC
      LIMIT ?
    `)
    .all(limit)
    .map((row) => getSummary(row.product_hash))
    .filter(Boolean);
}

module.exports = {
  create,
  findRecentSamePrice,
  getHistory,
  getLowestPrice,
  getAveragePrice,
  getHighestPrice,
  getLastSeen,
  findLatestByNormalizedTitle,
  getSummary,
  listSummaries
};
