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
