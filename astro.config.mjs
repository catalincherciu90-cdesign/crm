// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      // Pe Cloudflare Workers, react-dom/server.browser apeleaza MessageChannel
      // la startup (indisponibil). Fortam varianta edge, facuta pentru edge runtimes.
      alias: [{ find: /^react-dom\/server$/, replacement: 'react-dom/server.edge' }],
    },
  },
});
