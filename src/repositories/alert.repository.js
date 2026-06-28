const { getDatabase } = require("../database/db");
const { cleanProductTitle } = require("../utils/text");

function mapAlert(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    watchlistId: row.watchlist_id,
    productId: row.product_id,
    productTitle: cleanProductTitle(row.product_title),
    store: row.store,
    price: row.price,
    link: row.link,
    score: row.score,
    recommendation: row.recommendation,
    hash: row.hash,
    sentAt: row.sent_at
  };
}

function list(limit = 50) {
  return getDatabase()
    .prepare(`
      SELECT *
      FROM alerts
      ORDER BY sent_at DESC
      LIMIT ?
    `)
    .all(Number(limit))
    .map(mapAlert);
}

function findLatestByHash(hash) {
  const row = getDatabase()
    .prepare(`
      SELECT *
      FROM alerts
      WHERE hash = ?
      ORDER BY sent_at DESC
      LIMIT 1
    `)
    .get(hash);

  return mapAlert(row);
}

function findLatestByProductId(productId) {
  const row = getDatabase()
    .prepare(`
      SELECT *
      FROM alerts
      WHERE product_id = ?
      ORDER BY sent_at DESC, id DESC
      LIMIT 1
    `)
    .get(Number(productId));

  return mapAlert(row);
}

function create(input) {
  const sentAt = input.sentAt || new Date().toISOString();
  const result = getDatabase()
    .prepare(`
      INSERT INTO alerts (
        watchlist_id,
        product_id,
        product_title,
        store,
        price,
        link,
        score,
        recommendation,
        hash,
        sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.watchlistId || null,
      input.productId || null,
      input.productTitle,
      input.store,
      input.price,
      input.link,
      input.score,
      input.recommendation,
      input.hash,
      sentAt
    );

  return mapAlert({
    id: Number(result.lastInsertRowid),
    watchlist_id: input.watchlistId || null,
    product_id: input.productId || null,
    product_title: input.productTitle,
    store: input.store,
    price: input.price,
    link: input.link,
    score: input.score,
    recommendation: input.recommendation,
    hash: input.hash,
    sent_at: sentAt
  });
}

module.exports = {
  list,
  findLatestByHash,
  findLatestByProductId,
  create
};
