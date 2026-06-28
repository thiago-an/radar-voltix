const { getDatabase } = require("../database/db");
const seedItems = require("../data/watchlist.seed.json");

function parseAllowedStores(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function normalizeString(value, fallback = null) {
  if (value === undefined) {
    return fallback;
  }

  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeBoolean(value, fallback = true) {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    return ["1", "true", "yes", "sim"].includes(value.toLowerCase());
  }

  return Boolean(value);
}

function mapWatchlist(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    query: row.query,
    maxBuyPrice: row.max_buy_price,
    expectedSellPrice: row.expected_sell_price,
    minMarginPercent: row.min_margin_percent,
    category: row.category,
    priority: row.priority,
    allowedStores: parseAllowedStores(row.allowed_stores_json),
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeWatchlistInput(input, existing = {}) {
  const maxBuyPrice = input.maxBuyPrice ?? input.maxPrice ?? input.max_buy_price ?? existing.maxBuyPrice;
  const expectedSellPrice = input.expectedSellPrice ?? input.expected_sell_price ?? existing.expectedSellPrice;
  const minMarginPercent = input.minMarginPercent ?? input.min_margin_percent ?? existing.minMarginPercent ?? 25;
  const allowedStores = input.allowedStores ?? input.allowed_stores ?? existing.allowedStores ?? [];

  const parsedStores = Array.isArray(allowedStores) ? allowedStores : parseAllowedStores(allowedStores);

  return {
    name: normalizeString(input.name, existing.name),
    query: normalizeString(input.query, existing.query),
    maxBuyPrice: Number(maxBuyPrice),
    expectedSellPrice: Number(expectedSellPrice),
    minMarginPercent: Number(minMarginPercent),
    category: normalizeString(input.category, existing.category ?? null),
    priority: Number(input.priority ?? existing.priority ?? 1),
    allowedStores: [...new Set(parsedStores.map((store) => String(store).trim()).filter(Boolean))],
    enabled: normalizeBoolean(input.enabled, existing.enabled ?? true)
  };
}

function validateWatchlist(item) {
  const invalid = [];

  if (!item.name) invalid.push("name obrigatorio");
  if (!item.query) invalid.push("query obrigatoria");
  if (!Number.isFinite(item.maxBuyPrice) || item.maxBuyPrice <= 0) invalid.push("maxBuyPrice deve ser positivo");
  if (!Number.isFinite(item.expectedSellPrice) || item.expectedSellPrice <= 0) invalid.push("expectedSellPrice deve ser positivo");
  if (!Number.isFinite(item.minMarginPercent) || item.minMarginPercent < 0) invalid.push("minMarginPercent deve ser maior ou igual a 0");
  if (!Number.isInteger(item.priority) || item.priority < 1 || item.priority > 5) invalid.push("priority deve estar entre 1 e 5");

  if (invalid.length) {
    const error = new Error(`Campos invalidos: ${invalid.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }
}

function list(options = {}) {
  const includeDisabled = Boolean(options.includeDisabled);
  const db = getDatabase();
  const sql = includeDisabled
    ? "SELECT * FROM watchlist ORDER BY priority DESC, name ASC"
    : "SELECT * FROM watchlist WHERE enabled = 1 ORDER BY priority DESC, name ASC";

  return db.prepare(sql).all().map(mapWatchlist);
}

function findById(id) {
  const row = getDatabase()
    .prepare("SELECT * FROM watchlist WHERE id = ?")
    .get(Number(id));

  return mapWatchlist(row);
}

function create(input) {
  const item = normalizeWatchlistInput(input);
  validateWatchlist(item);

  const now = new Date().toISOString();
  const result = getDatabase()
    .prepare(`
      INSERT INTO watchlist (
        name,
        query,
        max_buy_price,
        expected_sell_price,
        min_margin_percent,
        category,
        priority,
        allowed_stores_json,
        enabled,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      item.name,
      item.query,
      item.maxBuyPrice,
      item.expectedSellPrice,
      item.minMarginPercent,
      item.category,
      item.priority,
      JSON.stringify(item.allowedStores),
      item.enabled ? 1 : 0,
      now,
      now
    );

  return findById(Number(result.lastInsertRowid));
}

function update(id, input) {
  const existing = findById(id);
  if (!existing) {
    return null;
  }

  const item = normalizeWatchlistInput(input, existing);
  validateWatchlist(item);

  getDatabase()
    .prepare(`
      UPDATE watchlist
      SET
        name = ?,
        query = ?,
        max_buy_price = ?,
        expected_sell_price = ?,
        min_margin_percent = ?,
        category = ?,
        priority = ?,
        allowed_stores_json = ?,
        enabled = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .run(
      item.name,
      item.query,
      item.maxBuyPrice,
      item.expectedSellPrice,
      item.minMarginPercent,
      item.category,
      item.priority,
      JSON.stringify(item.allowedStores),
      item.enabled ? 1 : 0,
      new Date().toISOString(),
      Number(id)
    );

  return findById(id);
}

function remove(id) {
  const result = getDatabase()
    .prepare("DELETE FROM watchlist WHERE id = ?")
    .run(Number(id));

  return result.changes > 0;
}

function seedInitialWatchlist() {
  const row = getDatabase()
    .prepare("SELECT COUNT(*) AS total FROM watchlist")
    .get();

  if (row.total > 0) {
    return 0;
  }

  seedItems.forEach((item) => create(item));
  return seedItems.length;
}

module.exports = {
  list,
  findById,
  create,
  update,
  remove,
  seedInitialWatchlist
};
