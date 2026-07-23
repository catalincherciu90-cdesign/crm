import { round2 } from './money';

export interface OfferLineInput {
  qty: number;
  unitPrice: number;
  discountPct?: number; // discount pe linie (0-100)
  vatRate?: number; // % TVA
}

export interface OfferLineComputed extends OfferLineInput {
  lineNet: number; // fara TVA, dupa discountul de linie
}

export interface OfferTotals {
  lines: OfferLineComputed[];
  subtotal: number; // suma net-urilor de linie, INAINTE de discountul de oferta
  discountTotal: number; // discountul aplicat la nivel de oferta
  netAfterDiscount: number; // subtotal - discountTotal
  vatTotal: number; // TVA calculat pe net-ul dupa discountul de oferta
  total: number; // netAfterDiscount + vatTotal
}

/** Net-ul unei linii (fara TVA), dupa discountul de linie. */
export function lineNet(line: OfferLineInput): number {
  const disc = clampPct(line.discountPct ?? 0);
  return round2(line.qty * line.unitPrice * (1 - disc / 100));
}

/**
 * Calculeaza toate totalurile unei oferte.
 * Discountul de oferta se aplica proportional peste net-ul fiecarei linii,
 * iar TVA-ul se calculeaza pe suma dupa discount (corect pe fiecare cota de TVA).
 */
export function computeOfferTotals(
  lines: OfferLineInput[],
  offerDiscountPct = 0,
): OfferTotals {
  const offerDisc = clampPct(offerDiscountPct);
  const factor = 1 - offerDisc / 100;

  const computed: OfferLineComputed[] = lines.map((l) => ({
    ...l,
    lineNet: lineNet(l),
  }));

  const subtotal = round2(computed.reduce((s, l) => s + l.lineNet, 0));
  const discountTotal = round2(subtotal * (offerDisc / 100));
  const netAfterDiscount = round2(subtotal - discountTotal);

  const vatTotal = round2(
    computed.reduce((s, l) => s + l.lineNet * factor * ((l.vatRate ?? 0) / 100), 0),
  );
  const total = round2(netAfterDiscount + vatTotal);

  return { lines: computed, subtotal, discountTotal, netAfterDiscount, vatTotal, total };
}

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** Genereaza urmatorul numar de oferta, ex. OF-2026-0007. */
export function nextOfferNumber(year: number, lastSeq: number): string {
  const seq = String(lastSeq + 1).padStart(4, '0');
  return `OF-${year}-${seq}`;
}
