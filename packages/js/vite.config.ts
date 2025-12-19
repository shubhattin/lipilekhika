// vite.config.ts
import { defineConfig } from 'vite';
import path from 'node:path';
import dts from 'vite-plugin-dts';
import MacroPlugin from 'unplugin-macros/vite';
import fs from 'node:fs';
import type { Plugin } from 'vite';

const IS_UMD_BUILD_MODE = process.env.VITE_IS_UMD_BUILD_MODE === 'true';

export default defineConfig({
  plugins: [
    dts({ include: ['src'], outDir: 'dist/types' }),
    MacroPlugin(),
    ...(IS_UMD_BUILD_MODE ? [copyAndMinifyJsonPlugin()] : [])
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'lipilekhika', // used for UMD/iife global when loaded via <script>
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
      output: !IS_UMD_BUILD_MODE
        ? [
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
        : [
            {
              format: 'umd',
              dir: 'dist',
              entryFileNames: 'lipilekhika.umd.js',
              name: 'lipilekhika',
              exports: 'named',
              preserveModules: false
            }
          ]
    }
  }
});

// minify and copy json files for umd module
function copyAndMinifyJsonPlugin(): Plugin {
  return {
    name: 'copy-minify-json',
    closeBundle: async () => {
      const srcDir = path.resolve(__dirname, 'src/script_data');
      const destDir = path.resolve(__dirname, 'dist/umd_json/script_data');
      const customOptionsSource = path.resolve(__dirname, 'src/custom_options.json');
      const customOptionsDest = path.resolve(__dirname, 'dist/umd_json/custom_options.json');

      fs.mkdirSync(destDir, { recursive: true });

      // script data files
      const files = fs.readdirSync(srcDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const sourcePath = path.join(srcDir, file);
          const destPath = path.join(destDir, file);
          const content = fs.readFileSync(sourcePath, 'utf-8');
          const minified = JSON.stringify(JSON.parse(content));
          fs.writeFileSync(destPath, minified, 'utf-8');
        }
      }
    }
  };
}
