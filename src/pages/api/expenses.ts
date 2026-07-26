import type { APIRoute } from 'astro';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/db';
import { expenses } from '@/db/schema';
import { badRequest, reqStr, numOr } from '@/lib/http';
import { EXPENSE_CATEGORIES } from '@/lib/expense';

export const prerender = false;

async function ensureTable(d1: D1Database) {
  try {
    await d1
      .prepare(
        `CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL DEFAULT (date('now')),
          category TEXT NOT NULL DEFAULT 'Altele', amount REAL NOT NULL DEFAULT 0, liters REAL,
          description TEXT, agent_id INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
      )
      .run();
  } catch {
    /* exista deja */
  }
}

// POST /api/expenses -> creeaza / sterge o cheltuiala (form submit)
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const db = getDb(locals.runtime.env.DB);
  await ensureTable(locals.runtime.env.DB);
  const fd = await request.formData();
  const user = locals.user;
  const isAdmin = user?.role === 'admin';

  // Stergere
  if (reqStr(fd, 'delete') === '1') {
    const id = Number(reqStr(fd, 'id'));
    if (!id) return badRequest('Cheltuială lipsă.');
    if (isAdmin) {
      await db.delete(expenses).where(eq(expenses.id, id));
    } else {
      // agentul poate sterge doar cheltuielile lui
      await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.agentId, user?.agentId ?? -1)));
    }
    return redirect('/expenses', 303);
  }

  const category = reqStr(fd, 'category');
  const amount = numOr(fd, 'amount', 0);
  if (!EXPENSE_CATEGORIES.includes(category as never)) return badRequest('Categorie invalidă.');
  if (amount <= 0) return badRequest('Suma trebuie să fie mai mare ca 0.');

  // Agentul isi trece cheltuielile pe el; adminul poate alege agentul
  const agentId = isAdmin ? Number(reqStr(fd, 'agentId')) || null : (user?.agentId ?? null);

  const data = {
    date: reqStr(fd, 'date') || undefined,
    category,
    amount,
    liters: category === 'Combustibil' ? numOr(fd, 'liters', 0) || null : null,
    description: reqStr(fd, 'description') || null,
    agentId,
  };

  const idRaw = reqStr(fd, 'id');
  if (idRaw) {
    const id = Number(idRaw);
    if (!isAdmin) {
      const [existing] = await db.select({ agentId: expenses.agentId }).from(expenses).where(eq(expenses.id, id));
      if (!existing || existing.agentId !== (user?.agentId ?? -1)) return badRequest('Nu ai acces la această cheltuială.');
    }
    await db.update(expenses).set(data).where(eq(expenses.id, id));
  } else {
    await db.insert(expenses).values(data);
  }

  return redirect('/expenses', 303);
};
