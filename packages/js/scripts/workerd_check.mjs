// Checks the WASM entries in the Cloudflare Workers runtime (workerd, through `wrangler dev`).
//
// Packs the built package (`bun run build` first) and installs the tarball and wrangler in a temp
// copy of `tests/workerd`, so the export conditions and the shipped `.wasm` file are used exactly
// as in a user's Worker. Each entry runs in its own Worker (see `tests/workerd/README.md`):
// - `wasm`: `lipilekhika/wasm` agrees with the JS output
// - `slim`: `lipilekhika/wasm/slim` asks for `initWasm` first, then agrees with the JS output
// - `root`: `transliterate_wasm` from `lipilekhika` fails, pointing to `lipilekhika/wasm`
//   bun run test:workerd
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url));
const WRANGLER_VERSION = '4.160.0';
const IS_WINDOWS = process.platform === 'win32';

const WORKERS = {
  wasm: ({ results }) => results.length > 0,
  slim: ({ results, error }) => {
    if (!error?.includes('initWasm')) throw new Error(`slim before initWasm: ${error}`);
    console.log(`  ok  workerd slim before initWasm: ${error}`);
    return results.length > 0;
  },
  root: ({ error }) => {
    if (!error?.includes("'lipilekhika/wasm'")) {
      throw new Error(`root transliterate_wasm should fail pointing to lipilekhika/wasm: ${error}`);
    }
    console.log(`  ok  workerd root transliterate_wasm fails: ${error}`);
    return true;
  }
};

function run(command, args, cwd) {
  const res = spawnSync(command, args, { cwd, stdio: 'inherit', shell: IS_WINDOWS });
  if (res.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${res.status})`);
}

const freePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

function stop(child) {
  if (!child?.pid) return;
  try {
    // with a shell (Windows) killing the child would leave wrangler / workerd running
    if (IS_WINDOWS) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']);
    else process.kill(-child.pid);
  } catch {}
}

async function checkWorker(app, name, verify) {
  const port = await freePort();
  writeFileSync(
    path.join(app, `wrangler.${name}.jsonc`),
    JSON.stringify({
      name: `lipilekhika-${name}`,
      main: `${name}/index.js`,
      compatibility_date: '2026-11-01'
    })
  );
  const dev = spawn(
    'npx',
    [
      'wrangler',
      'dev',
      '-c',
      `wrangler.${name}.jsonc`,
      '--port',
      String(port),
      '--ip',
      '127.0.0.1'
    ],
    { cwd: app, stdio: ['ignore', 'pipe', 'pipe'], shell: IS_WINDOWS, detached: !IS_WINDOWS }
  );
  let log = '';
  dev.stdout.on('data', (d) => (log += d));
  dev.stderr.on('data', (d) => (log += d));
  try {
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let i = 0; i < 120 && !ready; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      ready = await fetch(`${base}/ping`).then(
        (r) => r.ok,
        () => false
      );
    }
    if (!ready) throw new Error(`wrangler dev (${name}) did not start:\n${log}`);

    const res = await fetch(`${base}/`);
    const body = await res.text();
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}: ${body}`);
    const data = JSON.parse(body);
    for (const { label, js, wasm } of data.results) {
      if (js !== wasm) {
        throw new Error(
          `${name} ${label}: wasm ${JSON.stringify(wasm)} != js ${JSON.stringify(js)}`
        );
      }
      console.log(`  ok  workerd ${name} ${label} -> ${JSON.stringify(wasm)}`);
    }
    if (!verify(data)) throw new Error(`${name}: no results`);
  } finally {
    stop(dev);
  }
}

const tmp = mkdtempSync(path.join(os.tmpdir(), 'lipilekhika-workerd-'));
try {
  run('npm', ['pack', '--pack-destination', tmp], PACKAGE_ROOT);
  const tarball = readdirSync(tmp).find((f) => f.endsWith('.tgz'));
  const app = path.join(tmp, 'app');
  cpSync(path.join(PACKAGE_ROOT, 'tests/workerd'), app, { recursive: true });
  writeFileSync(path.join(app, 'package.json'), '{ "private": true, "type": "module" }');
  run(
    'npm',
    ['install', '--no-audit', '--no-fund', path.join(tmp, tarball), `wrangler@${WRANGLER_VERSION}`],
    app
  );
  for (const [name, verify] of Object.entries(WORKERS)) {
    await checkWorker(app, name, verify);
  }
  console.log('workerd check passed');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
