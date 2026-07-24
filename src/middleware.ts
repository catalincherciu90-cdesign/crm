import { defineMiddleware } from 'astro:middleware';
import { getSessionUser, SESSION_COOKIE } from '@/lib/auth';

/** Rute publice (fara login). */
const PUBLIC = new Set(['/login', '/api/login', '/api/first-admin']);

/** Prefixe permise DOAR adminului. Agentii nu au voie la import/administrare. */
const ADMIN_PREFIXES = [
  '/agents',
  '/api/agents',
  '/api/agent-account',
  '/clients/import',
  '/api/clients/import',
  '/api/clients/bulk-delete',
  '/api/clients/delete',
  '/products/import',
  '/products/new',
  '/api/products/import',
  '/api/products/import-images',
  '/api/products/delete',
  '/api/feed',
  '/api/image-feed',
  '/api/setup',
];

function isAdminOnly(path: string, method: string): boolean {
  if (ADMIN_PREFIXES.some((p) => path === p || path.startsWith(p + '/') || path.startsWith(p + '?'))) return true;
  // editarea/crearea produselor: doar admin (vizualizarea ramane libera)
  if (/^\/products\/\d+\/edit$/.test(path)) return true;
  if (path === '/api/products' && method !== 'GET') return true;
  return false;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;

  // Fisierele statice nu trec pe aici (servite de assets), deci protejam tot restul.
  if (PUBLIC.has(path)) return next();

  const d1 = context.locals.runtime?.env?.DB;
  if (!d1) return next(); // ex. prerender la build

  const token = context.cookies.get(SESSION_COOKIE)?.value ?? '';
  const user = token ? await getSessionUser(d1, token) : null;

  if (!user) {
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Neautentificat.' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
    return context.redirect('/login', 302);
  }

  context.locals.user = user;

  if (user.role !== 'admin' && isAdminOnly(path, context.request.method)) {
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Doar administratorul are acces.' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    }
    return context.redirect('/', 302);
  }

  return next();
});
