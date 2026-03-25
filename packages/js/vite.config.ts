// vite.config.ts
import { defineConfig } from 'vite';
import path from 'node:path';
import dts from 'vite-plugin-dts';
import MacroPlugin from 'unplugin-macros/vite';
import fs from 'node:fs';
import type { Plugin } from 'vite';

const IS_UMD_BUILD_MODE = process.env.VITE_IS_UMD_BUILD_MODE === 'true';
const NODE_BINDING_IMPORTS = new Set(['../binding/pkg', '../binding/pkg/index.mjs']);

export default defineConfig({
  plugins: [
    dts({ include: ['src'], outDir: 'dist/types' }),
    MacroPlugin(),
    ...(IS_UMD_BUILD_MODE ? [copyAndMinifyJsonPlugin()] : [copyNodeBindingPlugin()])
  ],
  build: {
    lib: {
      entry: IS_UMD_BUILD_MODE
        ? path.resolve(__dirname, 'src/index.umd.ts')
        : {
            index: path.resolve(__dirname, 'src/index.ts'),
            node: path.resolve(__dirname, 'src/node.ts'),
            typing: path.resolve(__dirname, 'src/typing.ts')
          },
      name: 'lipilekhika', // used for UMD/iife global when loaded via <script>
      // formats: ["es", "cjs", "iife", "umd"],
      fileName: (format, entryName) => {
        // For multi-entry ESM/CJS builds, emit `index.*` and `typing.*`
        const base = entryName ?? 'index';
        return `${base}.${format === 'es' ? 'mjs' : 'cjs'}`;
      }
    },
    rollupOptions: {
      external: (id) => id.startsWith('node:') || NODE_BINDING_IMPORTS.has(id),
      input: IS_UMD_BUILD_MODE
        ? { index: path.resolve(__dirname, 'src/index.umd.ts') }
        : {
            index: path.resolve(__dirname, 'src/index.ts'),
            node: path.resolve(__dirname, 'src/node.ts'),
            typing: path.resolve(__dirname, 'src/typing.ts')
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

function copyNodeBindingPlugin(): Plugin {
  return {
    name: 'copy-node-binding',
    closeBundle: async () => {
      const srcDir = path.resolve(__dirname, 'binding/pkg');
      const destDir = path.resolve(__dirname, 'dist/binding/pkg');

      if (!fs.existsSync(srcDir)) return;

      fs.rmSync(destDir, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(destDir), { recursive: true });
      fs.cpSync(srcDir, destDir, { recursive: true });
    }
  };
}

// minify and copy json files for umd module
function copyAndMinifyJsonPlugin(): Plugin {
  return {
    name: 'copy-minify-json',
    closeBundle: async () => {
      try {
        const srcDir = path.resolve(__dirname, 'src/script_data');
        const destDir = path.resolve(__dirname, 'dist/umd_json/script_data');

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
      } catch (error) {
        console.error('Error copying and minifying JSON files:', error);
      }
    }
  };
}
