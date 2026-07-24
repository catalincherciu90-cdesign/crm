import type { APIRoute } from 'astro';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { clients, offers } from '@/db/schema';
import { reqStr, badRequest } from '@/lib/http';

export const prerender = false;

// POST /api/clients/delete (form: id) -> sterge clientul (daca nu are oferte)
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const db = getDb(locals.runtime.env.DB);
  const fd = await request.formData();
  const id = Number(reqStr(fd, 'id'));
  if (!id) return badRequest('Client lipsă.');

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(offers)
    .where(eq(offers.clientId, id));
  if (n > 0) return redirect(`/clients/${id}?error=has_offers`, 303);

  await db.delete(clients).where(eq(clients.id, id));
  return redirect('/clients', 303);
};
