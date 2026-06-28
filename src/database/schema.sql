PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  max_buy_price REAL NOT NULL,
  expected_sell_price REAL NOT NULL,
  min_margin_percent REAL NOT NULL DEFAULT 25,
  category TEXT,
  priority INTEGER NOT NULL DEFAULT 1,
  allowed_stores_json TEXT NOT NULL DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  price REAL NOT NULL,
  old_price REAL,
  link TEXT,
  image TEXT,
  store TEXT NOT NULL,
  availability TEXT NOT NULL DEFAULT 'unknown',
  raw_json TEXT,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_store_link
ON products(store, link)
WHERE link IS NOT NULL AND link != '';

CREATE INDEX IF NOT EXISTS idx_products_store_title
ON products(store, title);

CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  watchlist_id INTEGER,
  crawler TEXT NOT NULL,
  product_title TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  product_hash TEXT NOT NULL,
  price REAL NOT NULL,
  old_price REAL,
  availability TEXT NOT NULL DEFAULT 'unknown',
  url TEXT,
  image TEXT,
  captured_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (watchlist_id) REFERENCES watchlist(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_hash
ON price_history(product_hash);

CREATE INDEX IF NOT EXISTS idx_price_history_captured_at
ON price_history(captured_at);

CREATE INDEX IF NOT EXISTS idx_price_history_crawler
ON price_history(crawler);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  watchlist_id INTEGER,
  product_id INTEGER,
  product_title TEXT NOT NULL,
  store TEXT NOT NULL,
  price REAL NOT NULL,
  link TEXT,
  score INTEGER NOT NULL,
  recommendation TEXT NOT NULL,
  hash TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  FOREIGN KEY (watchlist_id) REFERENCES watchlist(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_hash_sent_at
ON alerts(hash, sent_at);

CREATE TABLE IF NOT EXISTS crawler_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crawler TEXT NOT NULL,
  query TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  status TEXT NOT NULL,
  products_found INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_crawler_logs_created_at
ON crawler_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_crawler_logs_finished_at
ON crawler_logs(finished_at);

CREATE TABLE IF NOT EXISTS inventory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  purchase_price REAL NOT NULL CHECK (purchase_price >= 0),
  expected_sell_price REAL NOT NULL CHECK (expected_sell_price >= 0),
  marketplace TEXT NOT NULL DEFAULT 'mercadolivre',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_sku
ON inventory_items(sku)
WHERE sku IS NOT NULL AND sku != '';

CREATE INDEX IF NOT EXISTS idx_inventory_items_status
ON inventory_items(status);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inventory_item_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'sale', 'adjustment')),
  quantity INTEGER NOT NULL CHECK (quantity != 0),
  unit_price REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item
ON inventory_movements(inventory_item_id, created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_rankings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  source TEXT,
  ranking_size INTEGER DEFAULT 0,
  message_sent INTEGER DEFAULT 0,
  items_json TEXT NOT NULL
);