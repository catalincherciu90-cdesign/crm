import type { APIRoute } from 'astro';

export const prerender = false;

// Domenii de imagini permise (evita folosirea ca open-proxy)
const ALLOWED = [
  'cdn.braytron.center',
  'braytron.center',
  'spotvision-electric.ro',
  'b2b.spotvisionelectric.ro',
];

function hostAllowed(host: string): boolean {
  return ALLOWED.some((h) => host === h || host.endsWith('.' + h));
}

/**
 * GET /api/img?u=<url absolut>
 * Descarca o imagine externa server-side si o serveste de pe domeniul propriu,
 * fara Referer strain -> trece peste hotlink protection. Cache la edge.
 */
export const GET: APIRoute = async ({ url, locals }) => {
  const target = url.searchParams.get('u');
  if (!target) return new Response('missing u', { status: 400 });

  let u: URL;
  try {
    u = new URL(target);
  } catch {
    return new Response('bad url', { status: 400 });
  }
  if (u.protocol !== 'https:') return new Response('only https', { status: 400 });
  if (!hostAllowed(u.hostname)) return new Response('host not allowed', { status: 403 });

  // Cache la edge (Cloudflare: caches.default)
  interface EdgeCache {
    match(req: Request): Promise<Response | undefined>;
    put(req: Request, resp: Response): Promise<void>;
  }
  const cache = (globalThis as unknown as { caches?: { default?: EdgeCache } }).caches?.default;
  const cacheKey = new Request(url.toString());
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  // Unele CDN-uri servesc pozele doar cu browser real + Referer de pe domeniul lor
  // (altfel raspund 404/403). Incercam mai multe variante de Referer.
  const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  const referers = u.hostname.includes('braytron')
    ? ['https://www.braytron.center/', 'https://cdn.braytron.center/', u.origin + '/', '']
    : ['https://spotvision-electric.ro/', u.origin + '/', ''];

  let upstream: Response | null = null;
  for (const ref of referers) {
    const headers: Record<string, string> = {
      'user-agent': UA,
      accept: 'image/avif,image/webp,image/jpeg,image/png,image/*,*/*',
      'accept-language': 'ro-RO,ro;q=0.9,en;q=0.8',
    };
    if (ref) headers['referer'] = ref;
    try {
      const r = await fetch(u.toString(), { headers });
      if (r.ok) {
        upstream = r;
        break;
      }
    } catch {
      /* incearca urmatorul referer */
    }
  }

  if (!upstream) return new Response('upstream unavailable', { status: 502 });

  const resp = new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'image/jpeg',
      'cache-control': 'public, max-age=604800, immutable',
    },
  });

  if (cache) {
    try {
      locals.runtime.ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    } catch {
      /* fara cache */
    }
  }
  return resp;
};
