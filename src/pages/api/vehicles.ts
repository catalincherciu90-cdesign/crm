import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { vehicles, expenses } from '@/db/schema';
import { badRequest, reqStr, numOr } from '@/lib/http';

export const prerender = false;

// POST /api/vehicles -> creeaza / actualizeaza / sterge o masina (doar admin, impus de middleware)
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const db = getDb(locals.runtime.env.DB);
  const fd = await request.formData();

  if (reqStr(fd, 'delete') === '1') {
    const id = Number(reqStr(fd, 'id'));
    if (!id) return badRequest('Mașină lipsă.');
    await db.update(expenses).set({ vehicleId: null }).where(eq(expenses.vehicleId, id));
    await db.delete(vehicles).where(eq(vehicles.id, id));
    return redirect('/fleet', 303);
  }

  const plate = reqStr(fd, 'plate').toUpperCase().replace(/\s+/g, ' ');
  if (!plate) return badRequest('Numărul de înmatriculare este obligatoriu.');

  const data = {
    plate,
    make: reqStr(fd, 'make') || null,
    model: reqStr(fd, 'model') || null,
    year: Number(reqStr(fd, 'year')) || null,
    vin: reqStr(fd, 'vin') || null,
    fuelType: reqStr(fd, 'fuelType') || 'Motorină',
    odometer: numOr(fd, 'odometer', 0),
    agentId: Number(reqStr(fd, 'agentId')) || null,
    itpExpiry: reqStr(fd, 'itpExpiry') || null,
    rcaExpiry: reqStr(fd, 'rcaExpiry') || null,
    rovinietaExpiry: reqStr(fd, 'rovinietaExpiry') || null,
    cascoExpiry: reqStr(fd, 'cascoExpiry') || null,
    active: reqStr(fd, 'active') !== '0',
    notes: reqStr(fd, 'notes') || null,
  };

  const idRaw = reqStr(fd, 'id');
  try {
    if (idRaw) {
      await db.update(vehicles).set(data).where(eq(vehicles.id, Number(idRaw)));
    } else {
      await db.insert(vehicles).values(data);
    }
  } catch (err) {
    return badRequest('Eroare la salvare (număr duplicat?): ' + (err as Error).message);
  }

  return redirect('/fleet', 303);
};
