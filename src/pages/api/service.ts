import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { serviceRecords } from '@/db/schema';
import { badRequest, reqStr, numOr } from '@/lib/http';

export const prerender = false;

async function ensureTable(d1: D1Database) {
  try {
    await d1
      .prepare(
        `CREATE TABLE IF NOT EXISTS service_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT, vehicle_id INTEGER NOT NULL, date TEXT NOT NULL DEFAULT (date('now')),
          odometer REAL, cost REAL NOT NULL DEFAULT 0, description TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
      )
      .run();
  } catch {
    /* exista deja */
  }
}

// POST /api/service (doar admin) -> adauga / sterge o inregistrare de service
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const db = getDb(locals.runtime.env.DB);
  await ensureTable(locals.runtime.env.DB);
  const fd = await request.formData();
  const vehicleId = Number(reqStr(fd, 'vehicleId'));

  if (reqStr(fd, 'delete') === '1') {
    const id = Number(reqStr(fd, 'id'));
    if (id) await db.delete(serviceRecords).where(eq(serviceRecords.id, id));
    return redirect('/fleet/' + vehicleId, 303);
  }

  if (!vehicleId) return badRequest('Mașină lipsă.');
  await db.insert(serviceRecords).values({
    vehicleId,
    date: reqStr(fd, 'date') || undefined,
    odometer: numOr(fd, 'odometer', 0) || null,
    cost: numOr(fd, 'cost', 0),
    description: reqStr(fd, 'description') || null,
  });

  return redirect('/fleet/' + vehicleId, 303);
};
