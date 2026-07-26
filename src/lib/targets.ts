import { sql } from 'drizzle-orm';
import type { Db } from '@/db';

export interface MonthPoint {
  ym: string; // 'YYYY-MM'
  label: string; // ex. 'iul.'
  realized: number;
}

/** Ultimele n luni (inclusiv cea curenta), in ordine cronologica. */
export function lastMonths(n: number): { ym: string; label: string }[] {
  const out: { ym: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    out.push({ ym, label: m.toLocaleDateString('ro-RO', { month: 'short' }) });
  }
  return out;
}

/**
 * Totalul ofertelor acceptate pe fiecare din ultimele n luni.
 * agentId = null -> pe toata echipa.
 */
export async function monthlyRealized(db: Db, agentId: number | null, n = 6): Promise<MonthPoint[]> {
  const months = lastMonths(n);
  const start = months[0].ym + '-01';

  const rows = (
    agentId
      ? await db.all(sql`
          SELECT strftime('%Y-%m', o.issue_date) AS ym, coalesce(sum(o.total), 0) AS realized
          FROM offers o JOIN clients c ON c.id = o.client_id
          WHERE o.status = 'accepted' AND o.issue_date >= ${start} AND c.agent_id = ${agentId}
          GROUP BY ym`)
      : await db.all(sql`
          SELECT strftime('%Y-%m', o.issue_date) AS ym, coalesce(sum(o.total), 0) AS realized
          FROM offers o
          WHERE o.status = 'accepted' AND o.issue_date >= ${start}
          GROUP BY ym`)
  ) as { ym: string; realized: number }[];

  const map = new Map(rows.map((r) => [r.ym, Number(r.realized) || 0]));
  return months.map((m) => ({ ...m, realized: map.get(m.ym) ?? 0 }));
}
