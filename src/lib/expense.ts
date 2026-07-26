/** Categorii de cheltuieli (Combustibil evidentiat). */
export const EXPENSE_CATEGORIES = [
  'Combustibil',
  'Transport',
  'Cazare',
  'Diurnă',
  'Protocol',
  'Materiale',
  'Taxe & Comisioane',
  'Altele',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_ICON: Record<string, string> = {
  Combustibil: '⛽',
  Transport: '🚗',
  Cazare: '🏨',
  Diurnă: '🍽️',
  Protocol: '🤝',
  Materiale: '📦',
  'Taxe & Comisioane': '🧾',
  Altele: '💼',
};
