/** Autentificare: parole PBKDF2 (WebCrypto) + sesiuni in D1. Fara servicii externe. */

export interface SessionUser {
  id: number;
  email: string;
  name: string | null;
  role: 'admin' | 'agent';
  agentId: number | null;
}

const ITERATIONS = 100_000;
export const SESSION_COOKIE = 'crm_session';
export const SESSION_DAYS = 30;

function b64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}
function unb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as unknown as BufferSource, iterations },
    keyMaterial,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(key)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]) || ITERATIONS;
  const salt = unb64(parts[2]);
  const expected = unb64(parts[3]);
  const actual = await derive(password, salt, iterations);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

/** Creeaza tabelele de auth daca lipsesc (bootstrap sigur, idempotent). */
export async function ensureAuthTables(d1: D1Database): Promise<void> {
  await d1
    .prepare(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'agent',
        agent_id INTEGER, name TEXT, active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    )
    .run();
  await d1
    .prepare(
      `CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY, user_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    )
    .run();
}

function nowSql(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 19).replace('T', ' ');
}

export async function createSession(d1: D1Database, userId: number): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
  await d1
    .prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`)
    .bind(token, userId, nowSql(SESSION_DAYS))
    .run();
  return token;
}

export async function getSessionUser(d1: D1Database, token: string): Promise<SessionUser | null> {
  try {
    const row = await d1
      .prepare(
        `SELECT u.id, u.email, u.name, u.role, u.agent_id AS agentId
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > datetime('now') AND u.active = 1`,
      )
      .bind(token)
      .first<SessionUser & { role: string }>();
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role === 'admin' ? 'admin' : 'agent',
      agentId: row.agentId ?? null,
    };
  } catch {
    return null; // tabelele nu exista inca
  }
}

export async function destroySession(d1: D1Database, token: string): Promise<void> {
  try {
    await d1.prepare(`DELETE FROM sessions WHERE token = ?`).bind(token).run();
  } catch {
    /* ignora */
  }
}

export async function countUsers(d1: D1Database): Promise<number> {
  try {
    const row = await d1.prepare(`SELECT count(*) AS n FROM users`).first<{ n: number }>();
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}
