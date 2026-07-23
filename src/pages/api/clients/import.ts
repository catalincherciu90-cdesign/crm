import type { APIRoute } from 'astro';
import { getDb } from '@/db';
import { clients, type NewClient } from '@/db/schema';
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
  ]) {
    try {
      await locals.runtime.env.DB.prepare(stmt).run();
    } catch {
      /* exista deja */
    }
  }

  // Email-urile existente (pentru dedupe)
  const existing = await db.select({ email: clients.email }).from(clients);
  const seen = new Set(existing.map((r) => (r.email || '').trim().toLowerCase()).filter(Boolean));

  const rows: NewClient[] = [];
  let skipped = 0;

  for (const c of incoming) {
    const name = (c.name || '').trim();
    if (!name) {
      skipped++;
      continue;
    }
    const email = (c.email || '').trim();
    const key = email.toLowerCase();
    if (key && seen.has(key)) {
      skipped++;
      continue;
    }
    if (key) seen.add(key);
    rows.push({
      name,
      company: (c.company || '').trim() || null,
      email: email || null,
      phone: (c.phone || '').trim() || null,
      taxId: (c.taxId || '').trim() || null,
      address: (c.address || '').trim() || null,
      priceList: (c.priceList || '').trim() || null,
      active: c.active !== false, // implicit activ
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
