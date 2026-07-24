import type { APIRoute } from 'astro';
import { getDb } from '@/db';
import { clients, agents, type NewClient } from '@/db/schema';
import { json, badRequest } from '@/lib/http';

export const prerender = false;

const SUB_BATCH = 50;

interface IncomingClient {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  address?: string;
  priceList?: string;
  active?: boolean;
  agent?: string;
  notes?: string;
}

/**
 * POST /api/clients/import
 * Importa clienti dintr-un fisier (parsat in browser). Sare randurile fara nume
 * si duplicatele dupa email (email deja existent in baza sau in acelasi import).
 * body: { clients: IncomingClient[] }
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb(locals.runtime.env.DB);
  const body = (await request.json().catch(() => ({}))) as { clients?: IncomingClient[] };
  const incoming = Array.isArray(body.clients) ? body.clients : [];
  if (incoming.length === 0) return badRequest('Niciun client de importat.');

  // self-heal: asigura coloanele noi (baze mai vechi)
  for (const stmt of [
    `ALTER TABLE clients ADD COLUMN price_list TEXT`,
    `ALTER TABLE clients ADD COLUMN active INTEGER NOT NULL DEFAULT 1`,
    `CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, email TEXT,
      phone TEXT, active INTEGER NOT NULL DEFAULT 1, notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `ALTER TABLE clients ADD COLUMN agent_id INTEGER REFERENCES agents (id)`,
  ]) {
    try {
      await locals.runtime.env.DB.prepare(stmt).run();
    } catch {
      /* exista deja */
    }
  }

  // Agentii de vanzari din acest lot: creeaza-i pe cei noi si mapeaza nume -> id
  const agentNames = [
    ...new Set(
      incoming
        .map((c) => (c.agent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    ),
  ];
  const agentIdByName = new Map<string, number>();
  if (agentNames.length > 0) {
    for (const n of agentNames) {
      await db.insert(agents).values({ name: n }).onConflictDoNothing();
    }
    const rows = await db.select({ id: agents.id, name: agents.name }).from(agents);
    rows.forEach((a) => agentIdByName.set(a.name, a.id));
  }

  // Dedupe pe: email, CIF (taxId) si nume (normalizat) — fisierele ERP n-au email
  const existing = await db
    .select({ email: clients.email, taxId: clients.taxId, name: clients.name })
    .from(clients);
  const seenEmail = new Set(existing.map((r) => (r.email || '').trim().toLowerCase()).filter(Boolean));
  const normTax = (s: string) => s.toLowerCase().replace(/^ro/, '').replace(/[^0-9a-z]/g, '');
  const seenTax = new Set(existing.map((r) => normTax(r.taxId || '')).filter(Boolean));
  const normName = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const seenName = new Set(existing.map((r) => normName(r.name || '')).filter(Boolean));

  const rows: NewClient[] = [];
  let skipped = 0;

  for (const c of incoming) {
    const name = (c.name || '').trim();
    if (!name) {
      skipped++;
      continue;
    }
    const email = (c.email || '').trim();
    const emailKey = email.toLowerCase();
    const taxKey = normTax(c.taxId || '');
    const nameKey = normName(name);
    if ((emailKey && seenEmail.has(emailKey)) || (taxKey && seenTax.has(taxKey)) || seenName.has(nameKey)) {
      skipped++;
      continue;
    }
    if (emailKey) seenEmail.add(emailKey);
    if (taxKey) seenTax.add(taxKey);
    seenName.add(nameKey);
    rows.push({
      name,
      company: (c.company || '').trim() || null,
      email: email || null,
      phone: (c.phone || '').trim() || null,
      taxId: (c.taxId || '').trim() || null,
      address: (c.address || '').trim() || null,
      priceList: (c.priceList || '').trim() || null,
      active: c.active !== false, // implicit activ
      agentId: agentIdByName.get((c.agent || '').replace(/\s+/g, ' ').trim()) ?? null,
      notes: (c.notes || '').trim() || null,
    });
  }

  let inserted = 0;
  try {
    for (let i = 0; i < rows.length; i += SUB_BATCH) {
      const slice = rows.slice(i, i + SUB_BATCH);
      const stmts = slice.map((r) => db.insert(clients).values(r));
      if (stmts.length > 0) {
        await db.batch(stmts as [(typeof stmts)[number], ...(typeof stmts)[number][]]);
        inserted += stmts.length;
      }
    }
  } catch (err) {
    return json({ error: 'Eroare la import: ' + (err as Error).message, inserted, skipped }, 500);
  }

  return json({ inserted, skipped });
};
