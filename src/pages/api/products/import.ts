import type { APIRoute } from 'astro';
import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { products, type NewProduct } from '@/db/schema';
import { json, badRequest } from '@/lib/http';

export const prerender = false;

const SUB_BATCH = 100;

/**
 * POST /api/products/import
 * Importa un chunk de produse (upsert dupa SKU). Clientul trimite feed-ul pe bucati
 * ca sa afiseze progres si sa evite limitele de request.
 * body: { items: NewProduct[] }
 * raspuns: { processed }
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb(locals.runtime.env.DB);
  const body = (await request.json().catch(() => ({}))) as { items?: NewProduct[] };
  const items = Array.isArray(body.items) ? body.items : [];

  if (items.length === 0) return badRequest('Niciun produs de importat in acest chunk.');

  // Ignoram randurile fara SKU (cheia de upsert)
  const valid = items.filter((p) => p.sku && p.sku.trim());

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const buildUpsert = (row: NewProduct) =>
    db
      .insert(products)
      .values({ ...row, updatedAt: now })
      .onConflictDoUpdate({
        target: products.sku,
        // Actualizam doar campurile detinute de feed; pastram cele setate manual
        // (unit, vat_rate, low_stock_threshold, description).
        set: {
          name: row.name,
          category: row.category,
          price: row.price,
          priceA: row.priceA,
          priceB: row.priceB,
          listPrice: row.listPrice,
          stockQty: row.stockQty,
          brand: row.brand,
          barcode: row.barcode,
          images: row.images,
          files: row.files,
          externalId: row.externalId,
          source: row.source,
          updatedAt: now,
        },
      });

  type Stmt = ReturnType<typeof buildUpsert>;

  let processed = 0;
  try {
    for (let i = 0; i < valid.length; i += SUB_BATCH) {
      const slice = valid.slice(i, i + SUB_BATCH);
      const stmts = slice.map(buildUpsert);
      if (stmts.length > 0) {
        await db.batch(stmts as [Stmt, ...Stmt[]]);
        processed += stmts.length;
      }
    }
  } catch (err) {
    return json({ error: 'Eroare la import: ' + (err as Error).message, processed }, 500);
  }

  return json({ processed });
};

// Diagnostic: total produse + cate au poze / fise tehnice
export const GET: APIRoute = async ({ locals }) => {
  const db = getDb(locals.runtime.env.DB);
  const [row] = await db
    .select({
      total: sql<number>`count(*)`,
      dinFeed: sql<number>`sum(case when source <> 'manual' then 1 else 0 end)`,
      cuPoze: sql<number>`sum(case when images is not null and images <> '' then 1 else 0 end)`,
      cuFise: sql<number>`sum(case when files is not null and files <> '' then 1 else 0 end)`,
    })
    .from(products);
  const [sample] = await db
    .select({ sku: products.sku, images: products.images })
    .from(products)
    .where(sql`images is not null and images <> ''`)
    .limit(1);
  return json({ ...row, exempluPoza: sample?.images?.split('#')[0] ?? null, exempluSku: sample?.sku ?? null });
};
