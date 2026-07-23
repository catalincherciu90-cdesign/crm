import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

/**
 * Construieste clientul Drizzle peste binding-ul D1 (Astro.locals.runtime.env.DB).
 * Folosire in pagini/API:  const db = getDb(locals.runtime.env.DB);
 */
export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export { schema };
export type Db = ReturnType<typeof getDb>;
