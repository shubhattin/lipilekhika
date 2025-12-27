// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import react from '@astrojs/react';
import solid from '@astrojs/solid-js';
import vue from '@astrojs/vue';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  base: '/typing_tool_examples',
  trailingSlash: 'never',
  integrations: [
    svelte(),
    vue(),
    react({
      include: ['**/react/*']
    }),
    solid({
      include: ['**/solid/*']
    })
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});
