import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Model de date CRM.
 *
 * Sume monetare: stocate in `real` (unitatea monedei, ex. lei), rotunjite la 2 zecimale
 * in stratul de business. Cantitatile de stoc: `real` ca sa suporte si unitati fractionare (kg, m).
 */

// ---------- Clienti ----------
export const clients = sqliteTable(
  'clients',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    company: text('company'),
    email: text('email'),
    phone: text('phone'),
    taxId: text('tax_id'), // CUI / CIF
    address: text('address'),
    notes: text('notes'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [index('idx_clients_name').on(t.name)],
);

// ---------- Produse & stocuri ----------
export const products = sqliteTable(
  'products',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sku: text('sku').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category'),
    unit: text('unit').notNull().default('buc'), // buc, kg, m, ora...
    price: real('price').notNull().default(0), // pret unitar fara TVA
    vatRate: real('vat_rate').notNull().default(19), // % TVA implicit
    currency: text('currency').notNull().default('RON'),
    stockQty: real('stock_qty').notNull().default(0),
    lowStockThreshold: real('low_stock_threshold').notNull().default(0),
    // Sursa: 'manual' sau numele feed-ului de import (pregatit pentru faza 2)
    source: text('source').notNull().default('manual'),
    externalId: text('external_id'), // id-ul produsului in feed-ul extern
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    index('idx_products_name').on(t.name),
    index('idx_products_category').on(t.category),
  ],
);

// ---------- Oferte ----------
export const offers = sqliteTable(
  'offers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    number: text('number').notNull().unique(), // ex. OF-2026-0001
    clientId: integer('client_id')
      .notNull()
      .references(() => clients.id),
    status: text('status', { enum: ['draft', 'sent', 'accepted', 'rejected'] })
      .notNull()
      .default('draft'),
    currency: text('currency').notNull().default('RON'),
    issueDate: text('issue_date')
      .notNull()
      .default(sql`(date('now'))`),
    validUntil: text('valid_until'),
    // discount la nivel de oferta, procent (0-100)
    discountPct: real('discount_pct').notNull().default(0),
    notes: text('notes'),
    // Totaluri cache-uite (calculate din offer_items la salvare)
    subtotal: real('subtotal').notNull().default(0), // fara TVA, dupa discount pe linii
    discountTotal: real('discount_total').notNull().default(0), // discountul de oferta
    vatTotal: real('vat_total').notNull().default(0),
    total: real('total').notNull().default(0), // cu TVA
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    index('idx_offers_client').on(t.clientId),
    index('idx_offers_status').on(t.status),
  ],
);

// ---------- Linii de oferta ----------
export const offerItems = sqliteTable(
  'offer_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    offerId: integer('offer_id')
      .notNull()
      .references(() => offers.id, { onDelete: 'cascade' }),
    productId: integer('product_id').references(() => products.id),
    // Snapshot al produsului la momentul ofertei (ca sa nu se schimbe daca produsul se modifica)
    description: text('description').notNull(),
    unit: text('unit').notNull().default('buc'),
    qty: real('qty').notNull().default(1),
    unitPrice: real('unit_price').notNull().default(0), // fara TVA
    discountPct: real('discount_pct').notNull().default(0),
    vatRate: real('vat_rate').notNull().default(19),
    lineTotal: real('line_total').notNull().default(0), // fara TVA, dupa discount linie
    position: integer('position').notNull().default(0),
  },
  (t) => [index('idx_offer_items_offer').on(t.offerId)],
);

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;
export type OfferItem = typeof offerItems.$inferSelect;
export type NewOfferItem = typeof offerItems.$inferInsert;
