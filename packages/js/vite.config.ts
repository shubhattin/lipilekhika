// vite.config.ts
import { defineConfig } from 'vite';
import path from 'node:path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ include: ['src'] })],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'Lipilekhika', // used for UMD/iife
      // formats: ["es", "cjs", "iife", "umd"],
      fileName: (format) => {
        return `index.${format === 'es' ? 'mjs' : 'cjs'}`;
      }
    },
    rollupOptions: {
      external: [],
      input: {
        index: path.resolve(__dirname, 'src/index.ts')
      },
      output: [
        {
          format: 'es',
          dir: 'dist/esm',
          entryFileNames: '[name].mjs',
          preserveModules: false
        },
        {
          format: 'cjs',
          dir: 'dist/cjs',
          entryFileNames: '[name].cjs',
          exports: 'named',
          preserveModules: false
        }
      ]
    }
  }
});
