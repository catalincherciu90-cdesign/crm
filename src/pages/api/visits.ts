import type { APIRoute } from 'astro';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/db';
import { visits, clients } from '@/db/schema';
import { badRequest, reqStr } from '@/lib/http';
import { VISIT_PURPOSES, type VisitStatus } from '@/lib/visit';

export const prerender = false;

async function ensureTable(d1: D1Database) {
  try {
    await d1
      .prepare(
        `CREATE TABLE IF NOT EXISTS visits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER NOT NULL, agent_id INTEGER,
          date TEXT NOT NULL DEFAULT (date('now')), time TEXT,
          purpose TEXT NOT NULL DEFAULT 'Vizită comercială',
          status TEXT NOT NULL DEFAULT 'planned',
          location TEXT, notes TEXT, outcome TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
      )
      .run();
  } catch {
    /* exista deja */
  }
}

const VALID_STATUS: VisitStatus[] = ['planned', 'done', 'canceled'];

// POST /api/visits -> creeaza / actualizeaza / sterge / schimba statusul unei vizite (form submit)
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const db = getDb(locals.runtime.env.DB);
  await ensureTable(locals.runtime.env.DB);
  const fd = await request.formData();
  const user = locals.user;
  const isAdmin = user?.role === 'admin';
  const ownAgentId = user?.agentId ?? -1;

  // Verifica accesul agentului la o vizita existenta (proprie)
  const canTouch = async (id: number): Promise<boolean> => {
    if (isAdmin) return true;
    const [row] = await db.select({ agentId: visits.agentId }).from(visits).where(eq(visits.id, id));
    return !!row && row.agentId === ownAgentId;
  };

  // Stergere
  if (reqStr(fd, 'delete') === '1') {
    const id = Number(reqStr(fd, 'id'));
    if (!id) return badRequest('Vizită lipsă.');
    if (!(await canTouch(id))) return badRequest('Nu ai acces la această vizită.');
    await db.delete(visits).where(eq(visits.id, id));
    return redirect('/visits', 303);
  }

  // Schimbare rapida de status (Efectuată / Anulată / Reprogramare la planned)
  const setStatus = reqStr(fd, 'setStatus');
  if (setStatus) {
    const id = Number(reqStr(fd, 'id'));
    if (!id || !VALID_STATUS.includes(setStatus as VisitStatus)) return badRequest('Status invalid.');
    if (!(await canTouch(id))) return badRequest('Nu ai acces la această vizită.');
    const outcome = reqStr(fd, 'outcome');
    await db
      .update(visits)
      .set({ status: setStatus as VisitStatus, ...(outcome ? { outcome } : {}) })
      .where(eq(visits.id, id));
    return redirect(reqStr(fd, 'back') || '/visits', 303);
  }

  // Creare / editare
  const clientId = Number(reqStr(fd, 'clientId'));
  if (!clientId) return badRequest('Alege un client.');
  const date = reqStr(fd, 'date');
  if (!date) return badRequest('Alege o dată.');

  let purpose = reqStr(fd, 'purpose') || 'Vizită comercială';
  if (!VISIT_PURPOSES.includes(purpose as never)) purpose = 'Altele';

  const statusRaw = reqStr(fd, 'status') as VisitStatus;
  const status: VisitStatus = VALID_STATUS.includes(statusRaw) ? statusRaw : 'planned';

  // Agentul isi trece vizitele pe el; adminul poate alege agentul
  const agentId = isAdmin ? Number(reqStr(fd, 'agentId')) || null : (user?.agentId ?? null);

  // Verifica ca agentul are voie sa programeze pe acest client (clientul lui)
  if (!isAdmin) {
    const [c] = await db.select({ agentId: clients.agentId }).from(clients).where(eq(clients.id, clientId));
    if (!c || c.agentId !== ownAgentId) return badRequest('Nu ai acces la acest client.');
  }

  const data = {
    clientId,
    agentId,
    date,
    time: reqStr(fd, 'time') || null,
    purpose,
    status,
    location: reqStr(fd, 'location') || null,
    notes: reqStr(fd, 'notes') || null,
    outcome: reqStr(fd, 'outcome') || null,
  };

  const idRaw = reqStr(fd, 'id');
  if (idRaw) {
    const id = Number(idRaw);
    if (!(await canTouch(id))) return badRequest('Nu ai acces la această vizită.');
    await db.update(visits).set(data).where(eq(visits.id, id));
  } else {
    await db.insert(visits).values(data);
  }

  return redirect('/visits', 303);
};
