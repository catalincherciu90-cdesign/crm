/** Constante & helperi pentru programatorul de vizite. */

export const VISIT_PURPOSES = [
  'Vizită comercială',
  'Prezentare produs',
  'Ofertare',
  'Livrare',
  'Încasare',
  'Suport tehnic',
  'Altele',
] as const;

export type VisitStatus = 'planned' | 'done' | 'canceled';

export const VISIT_STATUS_META: Record<VisitStatus, { label: string; cls: string; icon: string }> = {
  planned: { label: 'Programată', cls: 'bg-indigo-100 text-indigo-700', icon: '📅' },
  done: { label: 'Efectuată', cls: 'bg-green-100 text-green-700', icon: '✅' },
  canceled: { label: 'Anulată', cls: 'bg-slate-100 text-slate-500', icon: '✖️' },
};

export const PURPOSE_ICON: Record<string, string> = {
  'Vizită comercială': '🤝',
  'Prezentare produs': '📦',
  Ofertare: '📄',
  Livrare: '🚚',
  Încasare: '💰',
  'Suport tehnic': '🛠',
  Altele: '•',
};

/** Paleta de culori pe agent (pentru calendar). Clasele sunt literale ca sa fie prinse de Tailwind. */
export const AGENT_PALETTE = [
  { chip: 'bg-indigo-100 text-indigo-800 border-indigo-200', dot: 'bg-indigo-500' },
  { chip: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  { chip: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  { chip: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-500' },
  { chip: 'bg-sky-100 text-sky-800 border-sky-200', dot: 'bg-sky-500' },
  { chip: 'bg-violet-100 text-violet-800 border-violet-200', dot: 'bg-violet-500' },
  { chip: 'bg-teal-100 text-teal-800 border-teal-200', dot: 'bg-teal-500' },
  { chip: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
  { chip: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200', dot: 'bg-fuchsia-500' },
  { chip: 'bg-lime-100 text-lime-800 border-lime-200', dot: 'bg-lime-500' },
] as const;

/** Culoarea stabila a unui agent (dupa id). Fara agent -> gri. */
export function agentColor(agentId: number | null | undefined) {
  if (!agentId) return { chip: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
  return AGENT_PALETTE[agentId % AGENT_PALETTE.length];
}

/** Cat de departe/aproape e o vizita programata fata de azi (pentru evidentiere). */
export function visitTiming(dateStr: string | null): { label: string; cls: string; state: 'overdue' | 'today' | 'soon' | 'future' } {
  if (!dateStr) return { label: '', cls: 'text-slate-500', state: 'future' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  const days = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { label: `acum ${-days} ${-days === 1 ? 'zi' : 'zile'}`, cls: 'text-red-600', state: 'overdue' };
  if (days === 0) return { label: 'astăzi', cls: 'text-amber-600 font-semibold', state: 'today' };
  if (days === 1) return { label: 'mâine', cls: 'text-amber-600', state: 'soon' };
  if (days <= 7) return { label: `în ${days} zile`, cls: 'text-slate-600', state: 'soon' };
  return { label: `în ${days} zile`, cls: 'text-slate-500', state: 'future' };
}
