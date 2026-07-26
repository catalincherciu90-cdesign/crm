export const FUEL_TYPES = ['Motorină', 'Benzină', 'GPL', 'Electric', 'Hibrid'] as const;

export interface DocStatus {
  label: string;
  cls: string;
  state: 'none' | 'ok' | 'soon' | 'expired';
  days: number | null; // zile pana la expirare (negativ = expirat)
}

/** Statusul unui document dupa data de expirare (prag "expira curand" = 30 zile). */
export function docStatus(dateStr: string | null | undefined, soonDays = 30): DocStatus {
  if (!dateStr) return { label: '—', cls: 'bg-slate-100 text-slate-400', state: 'none', days: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { label: 'Expirat', cls: 'bg-red-100 text-red-700', state: 'expired', days };
  if (days <= soonDays) return { label: `${days} zile`, cls: 'bg-amber-100 text-amber-700', state: 'soon', days };
  return { label: 'Valabil', cls: 'bg-green-100 text-green-700', state: 'ok', days };
}

/** Cel mai "urgent" status dintre mai multe documente ale unei masini. */
export function worstStatus(dates: (string | null | undefined)[]): DocStatus['state'] {
  const order = { expired: 3, soon: 2, ok: 1, none: 0 } as const;
  let worst: DocStatus['state'] = 'none';
  for (const d of dates) {
    const s = docStatus(d).state;
    if (order[s] > order[worst]) worst = s;
  }
  return worst;
}
