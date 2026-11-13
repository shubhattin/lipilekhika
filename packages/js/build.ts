#!/usr/bin/env bun

import { copyFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

type RunOptions = {
  cwd: string;
  quiet?: boolean;
};

/**
 * Using a TS Script instead of bash cross platform copatibility
 */
async function main() {
  const thisFile = fileURLToPath(import.meta.url);
  const packageRoot = path.resolve(path.dirname(thisFile), '.');

  await rm(path.join(packageRoot, 'dist'), { recursive: true, force: true });
  runStep('Make Script Data', 'bun', ['run', 'make-script-data'], {
    cwd: path.resolve(packageRoot, '../../lipi_script_data')
  });
  runStep('Build UMD', 'bun', ['cross-env', 'VITE_IS_UMD_BUILD_MODE=true', 'vite', 'build'], {
    cwd: packageRoot
  });
  runStep('Build ESM and CJS', 'bun', ['vite', 'build'], { cwd: packageRoot });

  // Declarations with `tsc` (TypeScript 7 has no compiler API for a Vite plugin), bundled into
  // one self-contained `.d.ts` per entry by api-extractor below. The shared script data package
  // (`@lipilekhika/script-data`) is `.ts` source, its declarations go to `dist/types/script-data`,
  // where `scripts/tsconfig.api-extractor.json` resolves its imports, so they are inlined too.
  const declarationArgs = ['--noEmit', 'false', '--declaration', '--emitDeclarationOnly'];
  runStep(
    'Declarations',
    'bun',
    ['x', 'tsc', '-p', 'tsconfig.json', ...declarationArgs, '--outDir', 'dist/types'],
    { cwd: packageRoot }
  );
  runStep(
    'Declarations (script data)',
    'bun',
    [
      'x',
      'tsc',
      '-p',
      '../../lipi_script_data/tsconfig.json',
      ...declarationArgs,
      '--outDir',
      'dist/types/script-data'
    ],
    { cwd: packageRoot }
  );

  runStep(
    '.d.ts file unification (index)',
    'bun',
    ['api-extractor', 'run', '--local', '--config', 'scripts/api-extractor.json'],
    {
      cwd: packageRoot,
      quiet: true
    }
  );

  runStep(
    '.d.ts file unification (typing)',
    'bun',
    ['api-extractor', 'run', '--local', '--config', 'scripts/api-extractor.typing.json'],
    {
      cwd: packageRoot,
      quiet: true
    }
  );

  runStep(
    '.d.ts file unification (node)',
    'bun',
    ['api-extractor', 'run', '--local', '--config', 'scripts/api-extractor.node.json'],
    {
      cwd: packageRoot,
      quiet: true
    }
  );

  runStep(
    '.d.ts file unification (wasm)',
    'bun',
    ['api-extractor', 'run', '--local', '--config', 'scripts/api-extractor.wasm.json'],
    {
      cwd: packageRoot,
      quiet: true
    }
  );

  runStep(
    '.d.ts file unification (wasm/slim)',
    'bun',
    ['api-extractor', 'run', '--local', '--config', 'scripts/api-extractor.wasm_slim.json'],
    {
      cwd: packageRoot,
      quiet: true
    }
  );

  // The `workerd` / `edge-light` builds of `lipilekhika/wasm` import the `.wasm` file as a module,
  // which only ESM tooling for those runtimes does: no CommonJS build is exported for them.
  for (const name of ['wasm.workerd.cjs', 'wasm.edge-light.cjs', 'wasm.browser.cjs']) {
    await rm(path.join(packageRoot, 'dist', 'cjs', name), { force: true });
  }

  const dist = path.join(packageRoot, 'dist');
  // CommonJS types for the `require` conditions: in this `"type": "module"` package a `.d.ts`
  // describes an ES module, which a CommonJS file can not import (TS1479 with `node16`). The
  // declarations are self-contained (bundled by api-extractor), so the same text as `.d.cts`.
  for (const name of ['index', 'node', 'typing', 'wasm', 'wasm_slim']) {
    await copyFile(path.join(dist, `${name}.d.ts`), path.join(dist, `${name}.d.cts`));
  }
  // types of `lipilekhika/lipilekhika.wasm` (for tooling that imports a `.wasm` file as a module)
  await writeFile(
    path.join(dist, 'lipilekhika.wasm.d.ts'),
    [
      '/**',
      ' * The WASM module of Lipi Lekhika, for `initWasm` from `lipilekhika/wasm/slim`, where the',
      ' * tooling imports a `.wasm` file as a `WebAssembly.Module` (eg. Cloudflare Workers).',
      ' */',
      'declare const wasmModule: WebAssembly.Module;',
      'export default wasmModule;',
      ''
    ].join('\n')
  );

  await rm(path.join(dist, 'types'), { recursive: true, force: true });
  // api-extractor writes it next to the `.d.ts` files, it is not needed in the package
  await rm(path.join(packageRoot, 'tsdoc-metadata.json'), { force: true });
  await rm(path.join(dist, 'tsdoc-metadata.json'), { force: true });
}

await main();

function runStep(name: string, command: string, args: string[], opts: RunOptions) {
  const res = spawnSync(command, args, {
    cwd: opts.cwd,
    stdio: opts.quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit'
  });

  if (res.error) {
    throw res.error;
  }

  if (res.status !== 0) {
    if (opts.quiet) {
      const stdout = res.stdout?.toString?.() ?? '';
      const stderr = res.stderr?.toString?.() ?? '';
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
    }
    throw new Error(`${name} failed with exit code ${res.status ?? 'unknown'}`);
  }
}

/*
# Manual Purge for jsdelivr on new version publish

CDN Cache Purge Tool : https://www.jsdelivr.com/tools/purge

Links :- (10 max at once)

https://cdn.jsdelivr.net/npm/lipilekhika/dist/lipilekhika.umd.js
https://cdn.jsdelivr.net/npm/lipilekhika@latest/dist/lipilekhika.umd.js
https://cdn.jsdelivr.net/npm/lipilekhika
https://cdn.jsdelivr.net/npm/lipilekhika@latest
https://cdn.jsdelivr.net/npm/lipilekhika/dist/esm/index.mjs
https://cdn.jsdelivr.net/npm/lipilekhika@latest/dist/esm/index.mjs
https://cdn.jsdelivr.net/npm/lipilekhika/dist/esm/typing.mjs
https://cdn.jsdelivr.net/npm/lipilekhika@latest/dist/esm/typing.mjs

*/
