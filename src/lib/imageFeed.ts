/** Mapare feed CSV de poze -> { sku, images } pentru actualizarea produselor. */

export interface ImageRow {
  sku: string;
  images: string; // URL-uri separate cu '#'
}

function norm(s: string): string {
  return s.replace(/^﻿/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Extrage toate URL-urile http(s) dintr-un text (indiferent de separator). */
function extractUrls(v: unknown): string[] {
  const s = v === null || v === undefined ? '' : String(v);
  return s.match(/https?:\/\/[^\s"'#,]+/g) ?? [];
}

/** Gaseste, pentru un set de headere, coloanele relevante (tolerant la BOM/spatii). */
function resolveCols(headers: string[]) {
  const find = (aliases: string[]) => headers.find((h) => aliases.includes(norm(h)));
  return {
    sku: find(['productcode', 'sku', 'cod', 'codprodus']),
    main: find(['size1280x1280', 'image', 'poza', 'imagineprincipala', 'mainimage']),
    gallery: find(['galleryimages', 'galerie', 'gallery', 'pozesuplimentare']),
  };
}

/** Transforma randurile CSV in { sku, images }, sarind ce n-are sku sau poza. */
export function mapImageRows(rows: Record<string, unknown>[]): ImageRow[] {
  if (rows.length === 0) return [];
  const cols = resolveCols(Object.keys(rows[0]));
  if (!cols.sku) return [];

  const out: ImageRow[] = [];
  for (const r of rows) {
    const sku = String(r[cols.sku] ?? '').replace(/^﻿/, '').trim();
    if (!sku) continue;
    const urls = [
      ...(cols.main ? extractUrls(r[cols.main]) : []),
      ...(cols.gallery ? extractUrls(r[cols.gallery]) : []),
    ];
    const unique = [...new Set(urls)];
    if (unique.length === 0) continue;
    out.push({ sku, images: unique.join('#') });
  }
  return out;
}
