import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { clients } from '@/db/schema';
import { json, badRequest, reqStr } from '@/lib/http';

export const prerender = false;

// GET /api/clients -> lista (JSON), folosita de constructorul de oferte
export const GET: APIRoute = async ({ locals }) => {
  const db = getDb(locals.runtime.env.DB);
  const rows = await db.select().from(clients).orderBy(clients.name);
  return json(rows);
};

// POST /api/clients -> creeaza sau actualizeaza (form submit), redirect la /clients
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const db = getDb(locals.runtime.env.DB);
  const fd = await request.formData();

  const name = reqStr(fd, 'name');
  if (!name) return badRequest('Numele clientului este obligatoriu.');

  const data = {
    name,
    company: reqStr(fd, 'company') || null,
    email: reqStr(fd, 'email') || null,
    phone: reqStr(fd, 'phone') || null,
    taxId: reqStr(fd, 'taxId') || null,
    address: reqStr(fd, 'address') || null,
    priceList: reqStr(fd, 'priceList') || null,
    notes: reqStr(fd, 'notes') || null,
  };

  const idRaw = reqStr(fd, 'id');
  if (idRaw) {
    await db.update(clients).set(data).where(eq(clients.id, Number(idRaw)));
  } else {
    await db.insert(clients).values(data);
  }

  return redirect('/clients', 303);
};
