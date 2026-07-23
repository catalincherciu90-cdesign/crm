import type { APIRoute } from 'astro';
import { json } from '@/lib/http';

export const prerender = false;

/**
 * GET /api/setup
 * Creeaza / actualizeaza schema bazei de date (idempotent).
 * Deschide o data in browser dupa un deploy care aduce coloane noi, ca sa nu fie
 * nevoie de consola D1. Sigur de rulat de mai multe ori.
 *
 * Nota: endpoint utilitar pentru setup. Poate fi protejat/eliminat dupa lansare.
 */
const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, company TEXT, email TEXT,
    phone TEXT, tax_id TEXT, address TEXT, price_list TEXT,
    active INTEGER NOT NULL DEFAULT 1, notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_clients_name ON clients (name)`,
  `ALTER TABLE clients ADD COLUMN price_list TEXT`,
  `ALTER TABLE clients ADD COLUMN active INTEGER NOT NULL DEFAULT 1`,

  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    description TEXT, category TEXT, unit TEXT NOT NULL DEFAULT 'buc',
    price REAL NOT NULL DEFAULT 0, price_a REAL NOT NULL DEFAULT 0,
    price_b REAL NOT NULL DEFAULT 0, list_price REAL NOT NULL DEFAULT 0,
    vat_rate REAL NOT NULL DEFAULT 19, currency TEXT NOT NULL DEFAULT 'RON',
    stock_qty REAL NOT NULL DEFAULT 0, low_stock_threshold REAL NOT NULL DEFAULT 0,
    brand TEXT, barcode TEXT, images TEXT, files TEXT,
    source TEXT NOT NULL DEFAULT 'manual', external_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_products_name ON products (name)`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products (category)`,
  `CREATE INDEX IF NOT EXISTS idx_products_external ON products (external_id)`,
  `CREATE INDEX IF NOT EXISTS idx_products_source ON products (source)`,

  `CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, number TEXT NOT NULL UNIQUE,
    client_id INTEGER NOT NULL REFERENCES clients (id), status TEXT NOT NULL DEFAULT 'draft',
    currency TEXT NOT NULL DEFAULT 'RON', issue_date TEXT NOT NULL DEFAULT (date('now')),
    valid_until TEXT, discount_pct REAL NOT NULL DEFAULT 0, notes TEXT,
    subtotal REAL NOT NULL DEFAULT 0, discount_total REAL NOT NULL DEFAULT 0,
    vat_total REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_offers_client ON offers (client_id)`,
  `CREATE INDEX IF NOT EXISTS idx_offers_status ON offers (status)`,

  `CREATE TABLE IF NOT EXISTS offer_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    offer_id INTEGER NOT NULL REFERENCES offers (id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products (id), description TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'buc', qty REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0, discount_pct REAL NOT NULL DEFAULT 0,
    vat_rate REAL NOT NULL DEFAULT 19, line_total REAL NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS idx_offer_items_offer ON offer_items (offer_id)`,

  `CREATE TABLE IF NOT EXISTS feed_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, url TEXT NOT NULL,
    price_field TEXT NOT NULL DEFAULT 'PRET_A', last_sync_at TEXT,
    last_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,

  // ALTER-uri pentru baze create inainte de aceste coloane (esueaza inofensiv daca exista deja)
  `ALTER TABLE products ADD COLUMN list_price REAL NOT NULL DEFAULT 0`,
  `ALTER TABLE products ADD COLUMN price_a REAL NOT NULL DEFAULT 0`,
  `ALTER TABLE products ADD COLUMN price_b REAL NOT NULL DEFAULT 0`,
  `ALTER TABLE products ADD COLUMN brand TEXT`,
  `ALTER TABLE products ADD COLUMN barcode TEXT`,
  `ALTER TABLE products ADD COLUMN images TEXT`,
  `ALTER TABLE products ADD COLUMN files TEXT`,

  `INSERT OR IGNORE INTO feed_sources (name, url, price_field) VALUES ('spotvision-b2b', 'https://b2b.spotvisionelectric.ro/userfiles/67478137-4ca2-48d6-b6f8-59f8be4f84f0/feeds/b8163d76-84b4-4750-a52e-37af8dc0a58d.xml', 'PRET_A')`,
];

export const GET: APIRoute = async ({ locals }) => {
  const d1 = locals.runtime.env.DB;
  let applied = 0;
  const skipped: string[] = [];

  for (const stmt of STATEMENTS) {
    try {
      await d1.prepare(stmt).run();
      applied++;
    } catch (err) {
      // duplicate column / already exists -> deja aplicat, ignoram
      const msg = (err as Error).message;
      const label = stmt.slice(0, 48).replace(/\s+/g, ' ');
      if (/duplicate column|already exists/i.test(msg)) {
        skipped.push(label + ' (exista deja)');
      } else {
        skipped.push(label + ' -> ' + msg);
      }
    }
  }

  return json({
    ok: true,
    message: 'Schema verificata/actualizata. Poti importa feed-ul acum.',
    applied,
    skipped,
  });
};
