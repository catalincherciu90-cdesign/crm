import { XMLParser } from 'fast-xml-parser';
import type { NewProduct } from '@/db/schema';

/**
 * Parser pentru feed-ul de produse Spotvision B2B (XML custom).
 * Structura: <products><product>...campuri CDATA...</product>...</products>
 */

export type PriceField = 'PRET_A' | 'PRET_B' | 'PRET_LISTA';

export interface FeedRaw {
  Product_Code?: string;
  Product_Name?: string;
  Category?: string;
  BrandName?: string;
  Cod_Furnizor?: string;
  PRET_LISTA?: string | number;
  PRET_A?: string | number;
  PRET_B?: string | number;
  Stock?: string | number;
  Product_ID?: string | number;
  ErpID?: string | number;
  EAN?: string | number;
  OVERLAY2?: string;
}

export interface MapOptions {
  priceField?: PriceField;
  vatRate?: number;
  source?: string;
}

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false, // pastram totul ca string; convertim noi (evita pierderi la EAN/coduri)
  trimValues: true,
  cdataPropName: false,
  isArray: (name) => name === 'product',
});

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim();
}

/** Extrage array-ul de produse brute din XML. Arunca daca XML-ul e invalid. */
export function parseFeed(xml: string): FeedRaw[] {
  const doc = parser.parse(xml) as { products?: { product?: FeedRaw[] } };
  const list = doc?.products?.product;
  if (!Array.isArray(list)) return [];
  return list;
}

/**
 * Randul-antet din feed are valorile egale cu numele campurilor
 * (Product_Code = "Product Code"). Il ignoram, la fel randurile fara SKU.
 */
export function isHeaderRow(p: FeedRaw): boolean {
  const code = str(p.Product_Code);
  return code === '' || code.toLowerCase() === 'product code';
}

/** Transforma un produs brut din feed intr-un rand de upsert pentru tabela products. */
export function mapFeedProduct(p: FeedRaw, opts: MapOptions = {}): NewProduct {
  const priceField = opts.priceField ?? 'PRET_A';
  const price = num(p[priceField]);
  return {
    sku: str(p.Product_Code),
    name: str(p.Product_Name) || str(p.Product_Code),
    description: null,
    category: str(p.Category) || null,
    unit: 'buc',
    price,
    listPrice: num(p.PRET_LISTA),
    vatRate: opts.vatRate ?? 19,
    currency: 'RON',
    stockQty: num(p.Stock),
    lowStockThreshold: 0,
    brand: str(p.BrandName) || null,
    barcode: str(p.EAN) || null,
    source: opts.source ?? 'spotvision-b2b',
    externalId: str(p.Product_ID) || null,
  };
}

/** Parseaza + mapeaza tot feed-ul, sarind randurile invalide. */
export function parseAndMapFeed(xml: string, opts: MapOptions = {}): NewProduct[] {
  return parseFeed(xml)
    .filter((p) => !isHeaderRow(p))
    .map((p) => mapFeedProduct(p, opts));
}
