/** Trece un URL de imagine externa prin proxy-ul propriu (evita blocarea hotlink a CDN-ului). */
export function proxied(u: string | null | undefined): string {
  if (!u) return '';
  if (u.startsWith('data:') || u.startsWith('/')) return u;
  return '/api/img?u=' + encodeURIComponent(u);
}
