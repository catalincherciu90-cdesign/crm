import { defineConfig } from 'drizzle-kit';

// Genereaza migrations din src/db/schema.ts.
// Aplicarea pe D1 se face cu wrangler (vezi scripturile db:migrate din package.json).
export default defineConfig({
  dialect: 'sqlite',
  driver: 'd1-http',
  schema: './src/db/schema.ts',
  out: './migrations',
});
