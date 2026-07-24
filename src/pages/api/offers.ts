import type { APIRoute } from 'astro';
import { like, desc } from 'drizzle-orm';
import { getDb } from '@/db';
import { offers, offerItems } from '@/db/schema';
import { json, badRequest } from '@/lib/http';
import { computeOfferTotals, lineNet, nextOfferNumber, type OfferLineInput } from '@/lib/offer';

export const prerender = false;

interface IncomingItem {
  productId?: number | null;
  description: string;
  unit?: string;
  qty: number;
  unitPrice: number;
  discountPct?: number;
  vatRate?: number;
}

interface IncomingOffer {
  clientId: number;
  status?: 'draft' | 'sent' | 'accepted' | 'rejected';
  currency?: string;
  validUntil?: string | null;
  discountPct?: number;
  notes?: string | null;
  items: IncomingItem[];
}

// POST /api/offers -> creeaza o oferta noua cu liniile ei (JSON). Raspunde cu { id, number }.
export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb(locals.runtime.env.DB);

  let body: IncomingOffer;
  try {
    body = (await request.json()) as IncomingOffer;
  } catch {
    return badRequest('Body JSON invalid.');
  }

  if (!body.clientId) return badRequest('Selecteaza un client.');
  if (!Array.isArray(body.items) || body.items.length === 0)
    return badRequest('Adauga cel putin o linie in oferta.');

  // Agentul poate crea oferte doar pentru clientii lui
  const user = locals.user;
  if (user?.role !== 'admin') {
    const client = await locals.runtime.env.DB
      .prepare(`SELECT agent_id FROM clients WHERE id = ?`)
      .bind(Number(body.clientId))
      .first<{ agent_id: number | null }>();
    if (!client || client.agent_id !== (user?.agentId ?? -1))
      return badRequest('Nu ai acces la acest client.');
  }

  const lines: OfferLineInput[] = body.items.map((it) => ({
    qty: Number(it.qty) || 0,
    unitPrice: Number(it.unitPrice) || 0,
    discountPct: Number(it.discountPct) || 0,
    vatRate: Number(it.vatRate) || 0,
  }));

  const totals = computeOfferTotals(lines, Number(body.discountPct) || 0);

  // Genereaza numarul ofertei pentru anul curent
  const year = new Date().getFullYear();
  const last = await db
    .select({ number: offers.number })
    .from(offers)
    .where(like(offers.number, `OF-${year}-%`))
    .orderBy(desc(offers.number))
    .limit(1);
  const lastSeq = last.length ? Number(last[0].number.split('-')[2]) || 0 : 0;
  const number = nextOfferNumber(year, lastSeq);

  const inserted = await db
    .insert(offers)
    .values({
      number,
      clientId: Number(body.clientId),
      status: body.status ?? 'draft',
      currency: body.currency ?? 'RON',
      validUntil: body.validUntil || null,
      discountPct: Number(body.discountPct) || 0,
      notes: body.notes || null,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      vatTotal: totals.vatTotal,
      total: totals.total,
    })
    .returning({ id: offers.id });

  const offerId = inserted[0].id;

  const itemRows = body.items.map((it, i) => ({
    offerId,
    productId: it.productId ?? null,
    description: it.description || 'Produs',
    unit: it.unit || 'buc',
    qty: Number(it.qty) || 0,
    unitPrice: Number(it.unitPrice) || 0,
    discountPct: Number(it.discountPct) || 0,
    vatRate: Number(it.vatRate) || 0,
    lineTotal: lineNet({
      qty: Number(it.qty) || 0,
      unitPrice: Number(it.unitPrice) || 0,
      discountPct: Number(it.discountPct) || 0,
    }),
    position: i,
  }));

  await db.insert(offerItems).values(itemRows);

  return json({ id: offerId, number }, 201);
};
