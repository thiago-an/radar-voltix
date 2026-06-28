const { getDatabase } = require("../database/db");

function listHistorySince(capturedAfter) {
  return getDatabase()
    .prepare(`
      SELECT
        ph.product_hash,
        ph.product_title,
        ph.crawler,
        ph.price AS purchase_price,
        ph.url,
        ph.image,
        ph.captured_at,
        w.expected_sell_price
      FROM price_history ph
      INNER JOIN watchlist w ON w.id = ph.watchlist_id
      WHERE ph.captured_at >= ?
      ORDER BY ph.captured_at DESC
    `)
    .all(capturedAfter)
    .map((row) => ({
      productHash: row.product_hash,
      productTitle: row.product_title,
      crawler: row.crawler,
      purchasePrice: row.purchase_price,
      sellPrice: row.expected_sell_price,
      url: row.url,
      image: row.image,
      capturedAt: row.captured_at
    }));
}

module.exports = {
  listHistorySince
};
