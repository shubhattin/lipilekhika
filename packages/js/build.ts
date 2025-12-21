#!/usr/bin/env bun

import { rm } from 'node:fs/promises';
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
  runStep('Make Script Data', 'bun', ['make-script-data'], { cwd: packageRoot });
  runStep('Build UMD', 'bun', ['cross-env', 'VITE_IS_UMD_BUILD_MODE=true', 'vite', 'build'], {
    cwd: packageRoot
  });
  runStep('Build ESM and CJS', 'bun', ['vite', 'build'], { cwd: packageRoot });
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

*/
