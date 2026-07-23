-- Faza 2: product feed
-- Aplicare:  npm run db:migrate:local  (sau :remote)

ALTER TABLE products ADD COLUMN list_price REAL NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN brand TEXT;
ALTER TABLE products ADD COLUMN barcode TEXT;

CREATE TABLE IF NOT EXISTS feed_sources (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL UNIQUE,
  url          TEXT NOT NULL,
  price_field  TEXT NOT NULL DEFAULT 'PRET_A',
  last_sync_at TEXT,
  last_count   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_external ON products (external_id);
CREATE INDEX IF NOT EXISTS idx_products_source ON products (source);

-- Sursa preconfigurata (Spotvision B2B). URL-ul poate fi schimbat din UI.
INSERT OR IGNORE INTO feed_sources (name, url, price_field) VALUES
  ('spotvision-b2b', 'https://b2b.spotvisionelectric.ro/userfiles/67478137-4ca2-48d6-b6f8-59f8be4f84f0/feeds/b8163d76-84b4-4750-a52e-37af8dc0a58d.xml', 'PRET_A');
