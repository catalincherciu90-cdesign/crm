import type { APIRoute } from 'astro';
import {
  ensureAuthTables,
  verifyPassword,
  createSession,
  SESSION_COOKIE,
  SESSION_DAYS,
} from '@/lib/auth';
import { reqStr } from '@/lib/http';

export const prerender = false;

// POST /api/login -> autentificare cu email + parola
export const POST: APIRoute = async ({ request, locals, cookies, redirect }) => {
  const d1 = locals.runtime.env.DB;
  await ensureAuthTables(d1);

  const fd = await request.formData();
  const email = reqStr(fd, 'email').toLowerCase();
  const password = fd.get('password');
  if (!email || typeof password !== 'string') return redirect('/login?error=invalid', 303);

  const user = await d1
    .prepare(`SELECT id, password_hash FROM users WHERE lower(email) = ? AND active = 1`)
    .bind(email)
    .first<{ id: number; password_hash: string }>();

  if (!user || !(await verifyPassword(password, user.password_hash)))
    return redirect('/login?error=invalid', 303);

  const token = await createSession(d1, user.id);
  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
  return redirect('/', 303);
};
