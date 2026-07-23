import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { products } from '@/db/schema';
import { json, badRequest, reqStr, numOr } from '@/lib/http';

export const prerender = false;

// GET /api/products -> lista (JSON), folosita de constructorul de oferte
export const GET: APIRoute = async ({ locals }) => {
  const db = getDb(locals.runtime.env.DB);
  const rows = await db.select().from(products).orderBy(products.name);
  return json(rows);
};

// POST /api/products -> creeaza / actualizeaza (form submit), redirect la /products
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const db = getDb(locals.runtime.env.DB);
  const fd = await request.formData();

  const sku = reqStr(fd, 'sku');
  const name = reqStr(fd, 'name');
  if (!sku) return badRequest('SKU este obligatoriu.');
  if (!name) return badRequest('Numele produsului este obligatoriu.');

  const data = {
    sku,
    name,
    description: reqStr(fd, 'description') || null,
    category: reqStr(fd, 'category') || null,
    unit: reqStr(fd, 'unit') || 'buc',
    price: numOr(fd, 'price', 0),
    vatRate: numOr(fd, 'vatRate', 19),
    currency: reqStr(fd, 'currency') || 'RON',
    stockQty: numOr(fd, 'stockQty', 0),
    lowStockThreshold: numOr(fd, 'lowStockThreshold', 0),
    updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
  };

  const idRaw = reqStr(fd, 'id');
  try {
    if (idRaw) {
      await db.update(products).set(data).where(eq(products.id, Number(idRaw)));
    } else {
      await db.insert(products).values(data);
    }
  } catch (err) {
    return badRequest('Eroare la salvare (SKU duplicat?): ' + (err as Error).message);
  }

  return redirect('/products', 303);
};
