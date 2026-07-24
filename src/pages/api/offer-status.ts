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

  // Agentul poate schimba doar statusul ofertelor clientilor lui
  const user = locals.user;
  if (user?.role !== 'admin') {
    const row = await locals.runtime.env.DB
      .prepare(`SELECT c.agent_id AS agentId FROM offers o JOIN clients c ON c.id = o.client_id WHERE o.id = ?`)
      .bind(id)
      .first<{ agentId: number | null }>();
    if (!row || row.agentId !== (user?.agentId ?? -1)) return badRequest('Nu ai acces la această ofertă.');
  }

  await db.update(offers).set({ status }).where(eq(offers.id, id));
  return redirect('/offers/' + id, 303);
};
