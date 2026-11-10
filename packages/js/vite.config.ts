// vite.config.ts
import { defineConfig } from 'vite';
import path from 'node:path';
import dts from 'unplugin-dts/vite';
import MacroPlugin from 'unplugin-macros/vite';
import fs from 'node:fs';
import type { Plugin } from 'vite';

const IS_UMD_BUILD_MODE = process.env.VITE_IS_UMD_BUILD_MODE === 'true';

/** `lipilekhika/wasm` (per export condition) and `lipilekhika/wasm/slim` */
const WASM_ENTRIES = {
  wasm: path.resolve(__dirname, 'src/wasm.ts'),
  'wasm.workerd': path.resolve(__dirname, 'src/wasm.workerd.ts'),
  'wasm.edge-light': path.resolve(__dirname, 'src/wasm.edge-light.ts'),
  wasm_slim: path.resolve(__dirname, 'src/wasm_slim.ts')
};
const WASM_SOURCE_PATH = path.resolve(__dirname, 'wasm/pkg/lipilekhika_wasm_bg.wasm');
/** The `.wasm` file shipped in the package (`lipilekhika/lipilekhika.wasm`) */
const WASM_DIST_PATH = path.resolve(__dirname, 'dist/lipilekhika.wasm');

export default defineConfig({
  resolve: {
    // UMD must not see dynamic JSON imports — Rolldown still resolves them even when branched away.
    alias: {
      '@lipilekhika/script-data-source': IS_UMD_BUILD_MODE
        ? path.resolve(__dirname, 'src/utils/get_script_data/get_umd.ts')
        : path.resolve(__dirname, 'src/utils/get_script_data/get_esm.ts')
    }
  },
  plugins: [
    // unplugin-dts uses `outDirs` (string | …); maps to former vite-plugin-dts `outDir`.
    dts({ include: ['src', 'wasm/wasm_modules.d.ts'], outDirs: 'dist/types' }),
    MacroPlugin(),
    ...(IS_UMD_BUILD_MODE
      ? [copyAndMinifyJsonPlugin()]
      : [copyNativeBinariesPlugin(), wasmModuleImportsPlugin()])
  ],
  build: {
    lib: {
      // Duplicates rolldownOptions.input; kept because unplugin-dts reads
      // config.build.lib.entry in configResolved (see unplugin-dts source).
      entry: IS_UMD_BUILD_MODE
        ? path.resolve(__dirname, 'src/index.umd.ts')
        : {
            index: path.resolve(__dirname, 'src/index.ts'),
            node: path.resolve(__dirname, 'src/node.ts'),
            typing: path.resolve(__dirname, 'src/typing.ts'),
            ...WASM_ENTRIES
          },
      name: 'lipilekhika', // used for UMD/iife global when loaded via <script>
      // formats: ["es", "cjs", "iife", "umd"],
      fileName: (format, entryName) => {
        // For multi-entry ESM/CJS builds, emit `index.*` and `typing.*`
        const base = entryName ?? 'index';
        return `${base}.${format === 'es' ? 'mjs' : 'cjs'}`;
      }
    },
    rolldownOptions: {
      external: (id) => id.startsWith('node:'),
      input: IS_UMD_BUILD_MODE
        ? { index: path.resolve(__dirname, 'src/index.umd.ts') }
        : {
            index: path.resolve(__dirname, 'src/index.ts'),
            node: path.resolve(__dirname, 'src/node.ts'),
            typing: path.resolve(__dirname, 'src/typing.ts'),
            ...WASM_ENTRIES
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

function copyNativeBinariesPlugin(): Plugin {
  return {
    name: 'copy-native-binaries',
    closeBundle: async () => {
      const srcDir = path.resolve(__dirname, 'binding/pkg');
      const destDir = path.resolve(__dirname, 'dist/native');

      if (!fs.existsSync(srcDir)) return;

      const nativeBinaryFiles = fs.readdirSync(srcDir).filter((file) => file.endsWith('.node'));

      fs.rmSync(destDir, { recursive: true, force: true });
      if (nativeBinaryFiles.length === 0) return;

      fs.mkdirSync(destDir, { recursive: true });
      for (const nativeBinaryFile of nativeBinaryFiles) {
        fs.copyFileSync(path.join(srcDir, nativeBinaryFile), path.join(destDir, nativeBinaryFile));
      }
    }
  };
}

/**
 * - `import wasm from '<pkg>/lipilekhika_wasm_bg.wasm'` (and `?module`) in the `workerd` /
 *   `edge-light` bindings stays an import in the output, of `dist/lipilekhika.wasm` (copied there),
 *   for the consumer's tooling (wrangler, the Cloudflare Vite plugin, Next.js) to load as a
 *   `WebAssembly.Module`.
 * - `wasm/bind.ts` (the default binding) gets the module as a base64 `data:` URL, written in place
 *   of its `new URL('./pkg/lipilekhika_wasm_bg.wasm', import.meta.url)`. Leaving that to library
 *   mode's asset inlining gives `new URL('data:...', '' + import.meta.url)`, which throws in the
 *   CommonJS build (no `import.meta.url` there, the base is "undefined").
 * - The wasm-bindgen glue's `init()` falls back to `new URL('lipilekhika_wasm_bg.wasm',
 *   import.meta.url)`, which library mode would inline as base64 into the glue chunk that every
 *   WASM entry shares. The bindings always pass the module explicitly, so the fallback is removed:
 *   only the chunk of `wasm/bind.ts` carries the base64 copy.
 */
function wasmModuleImportsPlugin(): Plugin {
  const GLUE_PATH = path.resolve(__dirname, 'wasm/pkg/lipilekhika_wasm.js');
  const DEFAULT_URL = "module_or_path = new URL('lipilekhika_wasm_bg.wasm', import.meta.url);";
  const BIND_PATH = path.resolve(__dirname, 'wasm/bind.ts');
  const BIND_URL = "new URL('./pkg/lipilekhika_wasm_bg.wasm', import.meta.url)";
  return {
    name: 'lipilekhika-wasm-module-imports',
    enforce: 'pre',
    apply: 'build',
    resolveId(source, importer) {
      const [file, query] = source.split('?');
      if (!importer || !file.endsWith('.wasm')) return null;
      if (path.resolve(path.dirname(importer), file) !== WASM_SOURCE_PATH) return null;
      // kept as written: every entry is in `dist/esm` or `dist/cjs`, one level below the file
      return {
        id: `../${path.basename(WASM_DIST_PATH)}${query ? `?${query}` : ''}`,
        external: true
      };
    },
    transform(code, id) {
      if (id === BIND_PATH) {
        if (!code.includes(BIND_URL)) {
          this.error(`\`${BIND_URL}\` not found in ${id}`);
        }
        const base64 = fs.readFileSync(WASM_SOURCE_PATH).toString('base64');
        return code.replace(
          BIND_URL,
          `new URL(${JSON.stringify(`data:application/wasm;base64,${base64}`)})`
        );
      }
      if (id !== GLUE_PATH) return null;
      if (!code.includes(DEFAULT_URL)) {
        this.error(`wasm-bindgen glue changed: \`${DEFAULT_URL}\` not found in ${id}`);
      }
      return code.replace(
        DEFAULT_URL,
        "throw new Error('lipilekhika: the WASM module must be passed to init()');"
      );
    },
    closeBundle() {
      fs.mkdirSync(path.dirname(WASM_DIST_PATH), { recursive: true });
      fs.copyFileSync(WASM_SOURCE_PATH, WASM_DIST_PATH);
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
