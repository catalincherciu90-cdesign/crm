import type { APIRoute } from 'astro';
import { inArray, and, or, like, eq, type SQL } from 'drizzle-orm';
import { getDb } from '@/db';
import { clients, offers } from '@/db/schema';
import { reqStr } from '@/lib/http';

export const prerender = false;

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/**
 * POST /api/clients/bulk-delete
 * - mod selectie: campuri `ids` (checkbox-uri)
 * - mod filtru: `all=1` + `q` / `active` -> sterge toti clientii care se potrivesc
 * Clientii care au oferte sunt sariti (nu se sterg).
 */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const db = getDb(locals.runtime.env.DB);
  const fd = await request.formData();

  let targetIds: number[] = [];
  if (reqStr(fd, 'all') === '1') {
    const q = reqStr(fd, 'q');
    const activeParam = reqStr(fd, 'active');
    const conds: SQL[] = [];
    if (q) {
      const pat = `%${q}%`;
      conds.push(
        or(
          like(clients.name, pat),
          like(clients.company, pat),
          like(clients.email, pat),
          like(clients.phone, pat),
          like(clients.taxId, pat),
        )!,
      );
    }
    if (activeParam === '1') conds.push(eq(clients.active, true));
    if (activeParam === '0') conds.push(eq(clients.active, false));
    const where = conds.length ? and(...conds) : undefined;
    const rows = await db.select({ id: clients.id }).from(clients).where(where);
    targetIds = rows.map((r) => r.id);
  } else {
    targetIds = fd
      .getAll('ids')
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n > 0);
  }

  if (targetIds.length === 0) return redirect('/clients', 303);

  // Clientii cu oferte -> nu se sterg
  const blocked = new Set<number>();
  for (const c of chunk(targetIds, 90)) {
    const r = await db.select({ cid: offers.clientId }).from(offers).where(inArray(offers.clientId, c));
    r.forEach((x) => blocked.add(x.cid));
  }
  const deletable = targetIds.filter((id) => !blocked.has(id));

  let deleted = 0;
  for (const c of chunk(deletable, 90)) {
    await db.delete(clients).where(inArray(clients.id, c));
    deleted += c.length;
  }
  const skipped = targetIds.length - deleted;

  return redirect(`/clients?deleted=${deleted}&skipped=${skipped}`, 303);
};
