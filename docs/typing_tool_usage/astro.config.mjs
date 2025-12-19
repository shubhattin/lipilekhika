// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import react from '@astrojs/react';
import solidJs from '@astrojs/solid-js';
import vue from '@astrojs/vue';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [svelte(), react(), solidJs(), vue()],

  vite: {
    plugins: [tailwindcss()]
  }
});
