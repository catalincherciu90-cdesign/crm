import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { products, offerItems } from '@/db/schema';
import { reqStr, badRequest } from '@/lib/http';

export const prerender = false;

// POST /api/products/delete (form: id) -> sterge produsul, redirect la /products
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const db = getDb(locals.runtime.env.DB);
  const fd = await request.formData();
  const id = Number(reqStr(fd, 'id'));
  if (!id) return badRequest('Produs lipsă.');

  // Desprinde produsul din liniile de ofertă (pastram snapshot-ul: descriere, pret)
  await db.update(offerItems).set({ productId: null }).where(eq(offerItems.productId, id));
  await db.delete(products).where(eq(products.id, id));

  return redirect('/products', 303);
};
