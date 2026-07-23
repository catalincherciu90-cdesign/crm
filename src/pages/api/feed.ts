import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { feedSources } from '@/db/schema';
import { json, badRequest } from '@/lib/http';
import { parseAndMapFeed, type PriceField } from '@/lib/feed';

export const prerender = false;

const PRICE_FIELDS: PriceField[] = ['PRET_A', 'PRET_B', 'PRET_LISTA'];

// GET /api/feed -> lista surselor de feed configurate
export const GET: APIRoute = async ({ locals }) => {
  const db = getDb(locals.runtime.env.DB);
  const rows = await db.select().from(feedSources);
  return json(rows);
};

// POST /api/feed -> descarca + parseaza feed-ul de la URL, returneaza produsele mapate
// body: { url, priceField?, vatRate? }
export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb(locals.runtime.env.DB);
  const body = (await request.json().catch(() => ({}))) as {
    url?: string;
    priceField?: PriceField;
    vatRate?: number;
    source?: string;
  };

  const url = (body.url || '').trim();
  if (!url) return badRequest('Lipseste URL-ul feed-ului.');

  const priceField: PriceField = PRICE_FIELDS.includes(body.priceField as PriceField)
    ? (body.priceField as PriceField)
    : 'PRET_A';

  // sursa implicita (pentru numele in tabela feed_sources)
  let source = (body.source || '').trim();
  if (!source) {
    const existing = await db.select().from(feedSources).where(eq(feedSources.url, url));
    source = existing[0]?.name || 'feed-import';
  }

  let xml: string;
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'CRM-FeedImporter/1.0', accept: 'application/xml,text/xml,*/*' },
    });
    if (!res.ok) return badRequest(`Feed-ul a raspuns cu HTTP ${res.status}. Verifica URL-ul / accesul.`);
    xml = await res.text();
  } catch (err) {
    return badRequest('Nu am putut descarca feed-ul: ' + (err as Error).message);
  }

  let products;
  try {
    products = parseAndMapFeed(xml, { priceField, vatRate: body.vatRate, source });
  } catch (err) {
    return badRequest('Feed XML invalid: ' + (err as Error).message);
  }

  return json({ source, priceField, count: products.length, products });
};

// PUT /api/feed -> inregistreaza finalizarea unei sincronizari (upsert dupa nume)
// body: { name, url, priceField, count }
export const PUT: APIRoute = async ({ request, locals }) => {
  const db = getDb(locals.runtime.env.DB);
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    url?: string;
    priceField?: string;
    count?: number;
  };
  const name = (body.name || '').trim();
  const url = (body.url || '').trim();
  if (!name || !url) return badRequest('name si url sunt obligatorii.');

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await db
    .insert(feedSources)
    .values({
      name,
      url,
      priceField: body.priceField || 'PRET_A',
      lastSyncAt: now,
      lastCount: body.count ?? 0,
    })
    .onConflictDoUpdate({
      target: feedSources.name,
      set: { url, priceField: body.priceField || 'PRET_A', lastSyncAt: now, lastCount: body.count ?? 0 },
    });

  return json({ ok: true });
};
