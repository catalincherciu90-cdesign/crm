import type { APIRoute } from 'astro';
import {
  ensureAuthTables,
  countUsers,
  hashPassword,
  createSession,
  SESSION_COOKIE,
  SESSION_DAYS,
} from '@/lib/auth';
import { reqStr, badRequest } from '@/lib/http';

export const prerender = false;

// POST /api/first-admin -> creeaza PRIMUL cont (admin). Functioneaza doar cand nu exista useri.
export const POST: APIRoute = async ({ request, locals, cookies, redirect }) => {
  const d1 = locals.runtime.env.DB;
  await ensureAuthTables(d1);
  if ((await countUsers(d1)) > 0) return redirect('/login?error=exists', 303);

  const fd = await request.formData();
  const email = reqStr(fd, 'email').toLowerCase();
  const password = fd.get('password');
  const name = reqStr(fd, 'name');
  if (!email || typeof password !== 'string' || password.length < 8)
    return badRequest('Email și parolă (min. 8 caractere) obligatorii.');

  const hash = await hashPassword(password);
  const res = await d1
    .prepare(`INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, 'admin', ?)`)
    .bind(email, hash, name || null)
    .run();
  const userId = Number(res.meta.last_row_id);

  const token = await createSession(d1, userId);
  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
  return redirect('/', 303);
};
