const { getDatabase } = require("../database/db");

function parseRaw(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return value;
  }
}

function mapProduct(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    price: row.price,
    oldPrice: row.old_price,
    link: row.link,
    image: row.image,
    store: row.store,
    availability: row.availability,
    raw: parseRaw(row.raw_json),
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at
  };
}

function findById(id) {
  const row = getDatabase()
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(Number(id));

  return mapProduct(row);
}

function findExisting(product) {
  const db = getDatabase();

  if (product.link) {
    const byLink = db
      .prepare("SELECT * FROM products WHERE store = ? AND link = ?")
      .get(product.store, product.link);

    if (byLink) {
      return mapProduct(byLink);
    }
  }

  const byTitle = db
    .prepare("SELECT * FROM products WHERE store = ? AND title = ?")
    .get(product.store, product.title);

  return mapProduct(byTitle);
}

function upsert(product) {
  const existing = findExisting(product);
  const now = new Date().toISOString();
  const rawJson = product.raw ? JSON.stringify(product.raw) : null;
  const oldPrice = product.oldPrice
    ?? (existing && existing.price !== product.price ? existing.price : existing?.oldPrice)
    ?? null;
  const link = product.link ?? existing?.link ?? null;
  const image = product.image ?? existing?.image ?? null;

  if (existing) {
    getDatabase()
      .prepare(`
        UPDATE products
        SET
          title = ?,
          price = ?,
          old_price = ?,
          link = ?,
          image = ?,
          availability = ?,
          raw_json = ?,
          last_seen_at = ?
        WHERE id = ?
      `)
      .run(
        product.title,
        product.price,
        oldPrice,
        link,
        image,
        product.availability || "unknown",
        rawJson,
        now,
        existing.id
      );

    return findById(existing.id);
  }

  const result = getDatabase()
    .prepare(`
      INSERT INTO products (
        title,
        price,
        old_price,
        link,
        image,
        store,
        availability,
        raw_json,
        first_seen_at,
        last_seen_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      product.title,
      product.price,
      oldPrice,
      link,
      image,
      product.store,
      product.availability || "unknown",
      rawJson,
      now,
      now
    );

  return findById(Number(result.lastInsertRowid));
}

module.exports = {
  findById,
  upsert
};
