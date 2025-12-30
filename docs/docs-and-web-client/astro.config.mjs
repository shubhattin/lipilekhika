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

// https://astro.build/config
export default defineConfig({
  site: 'https://lipilekhika.in',
  integrations: [
    starlight({
      logo: {
        src: '/public/main.png'
      },
      favicon: 'favicon.ico',
      plugins: [starlightThemeNext()],
      title: 'Lipi Lekhika',
      tagline: 'Type Indian Languages with Full Speed and Accuracy',
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
          autogenerate: { directory: 'getting-started' }
        },
        {
          label: 'API Reference',
          autogenerate: { directory: 'reference' }
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
    })
  ],
  vite: {
    plugins: [tailwindcss(), MacroPlugin()]
  }
});
