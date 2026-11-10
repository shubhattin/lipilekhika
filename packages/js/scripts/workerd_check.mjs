// Checks `lipilekhika/wasm` in the Cloudflare Workers runtime (workerd, through `wrangler dev`).
//
// Packs the built package (`bun run build` first), installs the tarball and wrangler in a temp
// copy of `tests/workerd`, so the export conditions and the shipped `.wasm` file are used exactly
// as a user's Worker uses them, then requests the Worker and compares WASM with the JS output.
//   bun run test:workerd
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url));
const WRANGLER_VERSION = '4';
const PORT = 8790 + Math.floor(Math.random() * 100);

function run(command, args, cwd) {
  const res = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  if (res.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${res.status})`);
}

const tmp = mkdtempSync(path.join(os.tmpdir(), 'lipilekhika-workerd-'));
let dev = null;
try {
  run('npm', ['pack', '--pack-destination', tmp], PACKAGE_ROOT);
  const tarball = readdirSync(tmp).find((f) => f.endsWith('.tgz'));
  const app = path.join(tmp, 'worker');
  cpSync(path.join(PACKAGE_ROOT, 'tests/workerd'), app, { recursive: true });
  run('npm', ['init', '-y'], app);
  run(
    'npm',
    ['install', '--no-audit', '--no-fund', path.join(tmp, tarball), `wrangler@${WRANGLER_VERSION}`],
    app
  );

  dev = spawn('npx', ['wrangler', 'dev', '--port', String(PORT), '--ip', '127.0.0.1'], {
    cwd: app,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    detached: process.platform !== 'win32'
  });
  let log = '';
  dev.stdout.on('data', (d) => (log += d));
  dev.stderr.on('data', (d) => (log += d));

  let body = null;
  for (let i = 0; i < 120 && body === null; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/`);
      body = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${body}`);
    } catch (error) {
      if (body !== null) throw error;
    }
  }
  if (body === null) throw new Error(`wrangler dev did not respond:\n${log}`);

  const { results } = JSON.parse(body);
  for (const { label, js, wasm } of results) {
    if (js !== wasm)
      throw new Error(`${label}: wasm ${JSON.stringify(wasm)} != js ${JSON.stringify(js)}`);
    console.log(`  ok  workerd wasm ${label} -> ${JSON.stringify(wasm)}`);
  }
  console.log('workerd check passed');
} finally {
  if (dev?.pid) {
    try {
      if (process.platform === 'win32') dev.kill();
      else process.kill(-dev.pid);
    } catch {}
  }
  rmSync(tmp, { recursive: true, force: true });
}
