import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import starlightThemeNext from 'starlight-theme-next';

import MacroPlugin from 'unplugin-macros/vite';
import svelte from '@astrojs/svelte';
import react from '@astrojs/react';
import vue from '@astrojs/vue';
import solidJs from '@astrojs/solid-js';
import sitemap from '@astrojs/sitemap';
import { netlifyRedirects } from './integrations/netlify-redirects';
import { fileURLToPath } from 'node:url';

/** Source of the JS package (`packages/js/src`) */
const JS_SRC = fileURLToPath(new URL('../../packages/js/src', import.meta.url));

// https://astro.build/config
export default defineConfig({
  site: 'https://lipilekhika.in',
  integrations: [
    starlight({
      logo: {
        src: '/public/favicon.svg'
      },
      favicon: 'favicon.svg',
      plugins: [starlightThemeNext()],
      title: 'Lipi Lekhika',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/shubhattin/lipilekhika' },
        { icon: 'npm', label: 'npm', href: 'https://www.npmjs.com/package/lipilekhika' }
      ],
      components: {
        Head: './src/components/starlight/Head.astro'
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [{ autogenerate: { directory: 'getting-started' } }]
        },
        {
          label: 'API Reference',
          items: [{ autogenerate: { directory: 'reference' } }]
        }
      ],
      customCss: ['./src/styles/global.css']
    }),
    svelte(),
    react({
      include: ['**/react/*']
    }),
    solidJs({
      include: ['**/solid/*']
    }),
    vue(),
    sitemap({
      filter: (page) => !page.includes('/typing_tool_examples/')
    }),
    netlifyRedirects()
  ],
  vite: {
    plugins: [tailwindcss(), MacroPlugin()],
    resolve: {
      // `lipilekhika` is the JS package's source, like the `paths` in tsconfig.json. Explicit,
      // as the repo root's `node_modules` links the `lipilekhika` workspace package (whose
      // `exports` only has the built entries), which plain resolution would find first.
      alias: [
        { find: /^lipilekhika$/, replacement: `${JS_SRC}/index_main.ts` },
        { find: /^lipilekhika\/(.*)$/, replacement: `${JS_SRC}/$1` }
      ]
    }
  }
});
