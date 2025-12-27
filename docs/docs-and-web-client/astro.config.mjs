import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import starlightThemeNext from 'starlight-theme-next';

import svelte from '@astrojs/svelte';

// https://astro.build/config
export default defineConfig({
  base: '/lipilekhika/',
  integrations: [
    starlight({
      plugins: [starlightThemeNext()],
      title: 'Lipi Lekhika Docs',
      tagline: 'Type Indian Languages with Full Speed and Accuracy',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/shubhattin/lipilekhika' }
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
    svelte()
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
