import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { agents, clients } from '@/db/schema';
import { badRequest, reqStr } from '@/lib/http';

export const prerender = false;

// POST /api/agents -> creeaza / actualizeaza / sterge un agent (form submit)
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const db = getDb(locals.runtime.env.DB);
  const fd = await request.formData();

  // Stergere: desprinde clientii de agent, apoi sterge
  if (reqStr(fd, 'delete') === '1') {
    const id = Number(reqStr(fd, 'id'));
    if (!id) return badRequest('Agent lipsă.');
    await db.update(clients).set({ agentId: null }).where(eq(clients.agentId, id));
    await db.delete(agents).where(eq(agents.id, id));
    return redirect('/agents', 303);
  }

  const name = reqStr(fd, 'name').replace(/\s+/g, ' ');
  if (!name) return badRequest('Numele agentului este obligatoriu.');

  const data = {
    name,
    email: reqStr(fd, 'email') || null,
    phone: reqStr(fd, 'phone') || null,
    active: reqStr(fd, 'active') !== '0',
    notes: reqStr(fd, 'notes') || null,
  };

  const idRaw = reqStr(fd, 'id');
  try {
    if (idRaw) {
      await db.update(agents).set(data).where(eq(agents.id, Number(idRaw)));
    } else {
      await db.insert(agents).values(data);
    }
  } catch (err) {
    return badRequest('Eroare la salvare (nume duplicat?): ' + (err as Error).message);
  }

  return redirect('/agents', 303);
};
