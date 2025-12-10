import { defineConfig } from 'vitest/config';
import os from 'node:os';

const cpuCount = os.availableParallelism?.() ?? os.cpus().length;

export default defineConfig({
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
