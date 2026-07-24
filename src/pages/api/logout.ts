import type { APIRoute } from 'astro';
import { destroySession, SESSION_COOKIE } from '@/lib/auth';

export const prerender = false;

// POST /api/logout -> inchide sesiunea
export const POST: APIRoute = async ({ locals, cookies, redirect }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(locals.runtime.env.DB, token);
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return redirect('/login', 303);
};
