/** Rotunjire la 2 zecimale (half-up), evitand erorile de floating point. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Formateaza o suma monetara pentru afisare, ex. 1234.5 -> "1.234,50 RON". */
export function formatMoney(amount: number, currency = 'RON'): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

/** Formateaza o cantitate (fara zecimale inutile). */
export function formatQty(qty: number): string {
  return new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 3 }).format(qty ?? 0);
}
