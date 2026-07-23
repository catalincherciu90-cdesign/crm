import type { APIRoute } from 'astro';
import { badRequest } from '@/lib/http';

export const prerender = false;

const ALLOWED = ['spotvisionelectric.ro', 'spotvision-electric.ro'];

/**
 * GET /api/image-feed?url=<url CSV>
 * Descarca feed-ul CSV de poze server-side si-l returneaza ca text (clientul il parseaza).
 */
export const GET: APIRoute = async ({ url }) => {
  const target = (url.searchParams.get('url') || '').trim();
  if (!target) return badRequest('Lipsește URL-ul feed-ului.');

  let u: URL;
  try {
    u = new URL(target);
  } catch {
    return badRequest('URL invalid.');
  }
  if (!ALLOWED.some((h) => u.hostname === h || u.hostname.endsWith('.' + h)))
    return badRequest('Domeniu nepermis pentru feed-ul de poze.');

  try {
    const res = await fetch(u.toString(), {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; CRM/1.0)',
        accept: 'text/csv,text/plain,*/*',
      },
    });
    if (!res.ok) return badRequest(`Feed-ul a răspuns cu HTTP ${res.status}.`);
    const text = await res.text();
    return new Response(text, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  } catch (err) {
    return badRequest('Nu am putut descărca feed-ul: ' + (err as Error).message);
  }
};
