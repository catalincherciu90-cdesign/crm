import type { APIRoute } from 'astro';
import { ensureAuthTables, hashPassword } from '@/lib/auth';
import { reqStr, badRequest } from '@/lib/http';

export const prerender = false;

/**
 * POST /api/agent-account (doar admin, impus de middleware)
 * Creeaza sau actualizeaza contul de acces al unui agent (email + parola noua).
 * fields: agentId, email, password (min. 8; obligatorie la creare, optionala la update)
 */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const d1 = locals.runtime.env.DB;
  await ensureAuthTables(d1);

  const fd = await request.formData();
  const agentId = Number(reqStr(fd, 'agentId'));
  const email = reqStr(fd, 'email').toLowerCase();
  const password = fd.get('password');
  if (!agentId) return badRequest('Agent lipsă.');
  if (!email) return badRequest('Email obligatoriu.');

  const agent = await d1.prepare(`SELECT id, name FROM agents WHERE id = ?`).bind(agentId).first<{ id: number; name: string }>();
  if (!agent) return badRequest('Agentul nu există.');

  const existing = await d1
    .prepare(`SELECT id FROM users WHERE agent_id = ?`)
    .bind(agentId)
    .first<{ id: number }>();

  const pw = typeof password === 'string' ? password : '';

  try {
    if (existing) {
      // update: email mereu; parola doar daca s-a completat
      if (pw) {
        if (pw.length < 8) return badRequest('Parola trebuie să aibă min. 8 caractere.');
        await d1
          .prepare(`UPDATE users SET email = ?, password_hash = ?, name = ?, active = 1 WHERE id = ?`)
          .bind(email, await hashPassword(pw), agent.name, existing.id)
          .run();
      } else {
        await d1
          .prepare(`UPDATE users SET email = ?, name = ?, active = 1 WHERE id = ?`)
          .bind(email, agent.name, existing.id)
          .run();
      }
    } else {
      if (pw.length < 8) return badRequest('Parola trebuie să aibă min. 8 caractere.');
      await d1
        .prepare(`INSERT INTO users (email, password_hash, role, agent_id, name) VALUES (?, ?, 'agent', ?, ?)`)
        .bind(email, await hashPassword(pw), agentId, agent.name)
        .run();
    }
  } catch (err) {
    return badRequest('Eroare (email deja folosit?): ' + (err as Error).message);
  }

  return redirect(`/agents/${agentId}?account=ok`, 303);
};
