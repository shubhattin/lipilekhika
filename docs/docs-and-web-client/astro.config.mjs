// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';

import svelte from '@astrojs/svelte';

// https://astro.build/config
export default defineConfig({
  base: '/lipilekhika/',
  integrations: [
    starlight({
      title: 'Docs with Tailwind',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/shubhattin/lipilekhika' }
      ],
      components: {
        Head: './src/components/starlight/Head.astro'
      },
      sidebar: [
        {
          label: 'Guides',
          items: [
            // Each item here is one entry in the navigation menu.
            { label: 'Example Guide', slug: 'guides/example' }
          ]
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'reference' }
        }
      ],
      customCss: ['./src/styles/global.css']
    }),
    svelte()
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
