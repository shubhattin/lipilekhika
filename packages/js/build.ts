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
  runStep('make-script-data', 'bun', ['make-script-data'], { cwd: packageRoot });
  runStep('vite build', 'bun', ['vite', 'build'], { cwd: packageRoot });
  runStep('api-extractor', 'bun', ['api-extractor', 'run', '--local'], {
    cwd: packageRoot,
    quiet: true
  });

  await rm(path.join(packageRoot, 'dist', 'types'), { recursive: true, force: true });
  await rm(path.join(packageRoot, 'tsdoc-metadata.json'), { force: true });
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
