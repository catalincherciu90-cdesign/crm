import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { offers } from '@/db/schema';
import { badRequest, reqStr } from '@/lib/http';

export const prerender = false;

const VALID = ['draft', 'sent', 'accepted', 'rejected'] as const;

// POST /api/offer-status -> schimba statusul unei oferte (form submit), redirect inapoi
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const db = getDb(locals.runtime.env.DB);
  const fd = await request.formData();
  const id = Number(reqStr(fd, 'id'));
  const status = reqStr(fd, 'status') as (typeof VALID)[number];

  if (!id) return badRequest('Oferta lipseste.');
  if (!VALID.includes(status)) return badRequest('Status invalid.');

  await db.update(offers).set({ status }).where(eq(offers.id, id));
  return redirect('/offers/' + id, 303);
};
