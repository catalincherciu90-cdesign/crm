/** Helpers pentru raspunsuri API. */

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function badRequest(message: string): Response {
  return json({ error: message }, 400);
}

export function notFound(message = 'Not found'): Response {
  return json({ error: message }, 404);
}

/** Citeste un string obligatoriu dintr-un FormData. */
export function reqStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

/** Citeste un numar dintr-un FormData (default daca lipseste/invalid). */
export function numOr(fd: FormData, key: string, def = 0): number {
  const v = fd.get(key);
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : NaN;
  return Number.isFinite(n) ? n : def;
}
