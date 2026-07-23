-- CRM initial schema (D1 / SQLite)
-- Aplicare:  npm run db:migrate:local   (sau :remote)

CREATE TABLE IF NOT EXISTS clients (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  company    TEXT,
  email      TEXT,
  phone      TEXT,
  tax_id     TEXT,
  address    TEXT,
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients (name);

CREATE TABLE IF NOT EXISTS products (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  sku                  TEXT NOT NULL UNIQUE,
  name                 TEXT NOT NULL,
  description          TEXT,
  category             TEXT,
  unit                 TEXT NOT NULL DEFAULT 'buc',
  price                REAL NOT NULL DEFAULT 0,
  vat_rate             REAL NOT NULL DEFAULT 19,
  currency             TEXT NOT NULL DEFAULT 'RON',
  stock_qty            REAL NOT NULL DEFAULT 0,
  low_stock_threshold  REAL NOT NULL DEFAULT 0,
  source               TEXT NOT NULL DEFAULT 'manual',
  external_id          TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

CREATE TABLE IF NOT EXISTS offers (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  number         TEXT NOT NULL UNIQUE,
  client_id      INTEGER NOT NULL REFERENCES clients (id),
  status         TEXT NOT NULL DEFAULT 'draft',
  currency       TEXT NOT NULL DEFAULT 'RON',
  issue_date     TEXT NOT NULL DEFAULT (date('now')),
  valid_until    TEXT,
  discount_pct   REAL NOT NULL DEFAULT 0,
  notes          TEXT,
  subtotal       REAL NOT NULL DEFAULT 0,
  discount_total REAL NOT NULL DEFAULT 0,
  vat_total      REAL NOT NULL DEFAULT 0,
  total          REAL NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_offers_client ON offers (client_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers (status);

CREATE TABLE IF NOT EXISTS offer_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  offer_id     INTEGER NOT NULL REFERENCES offers (id) ON DELETE CASCADE,
  product_id   INTEGER REFERENCES products (id),
  description  TEXT NOT NULL,
  unit         TEXT NOT NULL DEFAULT 'buc',
  qty          REAL NOT NULL DEFAULT 1,
  unit_price   REAL NOT NULL DEFAULT 0,
  discount_pct REAL NOT NULL DEFAULT 0,
  vat_rate     REAL NOT NULL DEFAULT 19,
  line_total   REAL NOT NULL DEFAULT 0,
  position     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_offer_items_offer ON offer_items (offer_id);
