import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { agents, clients } from '@/db/schema';
import { badRequest, reqStr, numOr } from '@/lib/http';

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
    // sterge si contul de acces + sesiunile lui
    try {
      await locals.runtime.env.DB
        .prepare(`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE agent_id = ?)`)
        .bind(id)
        .run();
      await locals.runtime.env.DB.prepare(`DELETE FROM users WHERE agent_id = ?`).bind(id).run();
    } catch {
      /* tabelele auth pot lipsi */
    }
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
    monthlyTarget: numOr(fd, 'monthlyTarget', 0),
    notes: reqStr(fd, 'notes') || null,
  };

  // self-heal coloana target (baze mai vechi)
  try {
    await locals.runtime.env.DB.prepare(`ALTER TABLE agents ADD COLUMN monthly_target REAL NOT NULL DEFAULT 0`).run();
  } catch {
    /* exista deja */
  }

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
