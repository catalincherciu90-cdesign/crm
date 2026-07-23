import type { APIRoute } from 'astro';
import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { products } from '@/db/schema';
import { json, badRequest } from '@/lib/http';

export const prerender = false;

const SUB_BATCH = 50;

interface Item {
  sku: string;
  images: string;
}

/**
 * POST /api/products/import-images
 * Actualizeaza DOAR pozele produselor (dupa SKU), fara sa atinga pret/stoc.
 * body: { items: { sku, images }[] }
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb(locals.runtime.env.DB);
  const body = (await request.json().catch(() => ({}))) as { items?: Item[] };
  const items = (Array.isArray(body.items) ? body.items : []).filter((i) => i.sku && i.images);
  if (items.length === 0) return json({ processed: 0 });

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  let processed = 0;
  try {
    for (let i = 0; i < items.length; i += SUB_BATCH) {
      const slice = items.slice(i, i + SUB_BATCH);
      const stmts = slice.map((it) =>
        db
          .update(products)
          .set({ images: it.images, updatedAt: now })
          .where(sql`${products.sku} = ${it.sku}`),
      );
      if (stmts.length > 0) {
        await db.batch(stmts as [(typeof stmts)[number], ...(typeof stmts)[number][]]);
        processed += stmts.length;
      }
    }
  } catch (err) {
    return json({ error: 'Eroare la import poze: ' + (err as Error).message, processed }, 500);
  }
  return json({ processed });
};
