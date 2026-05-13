import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cpuCount = os.availableParallelism?.() ?? os.cpus().length;

export default defineConfig({
  resolve: {
    alias: {
      '@lipilekhika/script-data-source': path.resolve(
        __dirname,
        'src/utils/get_script_data/get_esm.ts'
      )
    }
  },
  test: {
    // Enable file-level parallelism
    fileParallelism: true,

    // Maximum number of concurrent tests
    maxConcurrency: cpuCount * 4,

    // Don't isolate environment per test file (faster but less isolated)
    isolate: false,

    coverage: {
      provider: 'v8'
    }
  }
});
