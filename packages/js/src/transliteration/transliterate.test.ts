#!/usr/bin/env bun

import * as fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { afterAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { transliterate, preloadScriptData } from '../index';
import { z } from 'zod';

const TEST_DATA_FOLDER = path.resolve('..', '..', 'test_data', 'transliteration');
const TEST_FILES_TO_IGNORE: string[] = [];

const listYamlFiles = (directory: string): string[] => {
  const collected: string[] = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.resolve(directory, entry.name);
    if (entry.isDirectory()) {
      collected.push(...listYamlFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.yaml')) {
      collected.push(fullPath);
    }
  }
  return collected;
};

const TestDataTypeSchema = z.object({
  index: z.number(),
  from: z.string(),
  to: z.string(),
  input: z.string(),
  output: z.string(),
  reversible: z.boolean().optional()
});

type TransliterationTask = {
  input: string;
  from: string;
  to: string;
};

type TransliterationResponse = {
  id: number;
  result?: string;
  error?: string;
};

type WorkerLike = {
  postMessage(data: unknown): void;
  terminate(): any;
  onmessage: ((event: any) => void) | null;
  onerror: ((error: any) => void) | null;
  [key: string]: unknown;
};

const workerScriptUrl = new URL('./transliterate.worker.ts', import.meta.url).href;
const workerCtor = (globalThis as unknown as { Worker?: new (...args: any[]) => WorkerLike })
  .Worker;
// Use all available cores, or even more since transliteration might be I/O bound
const cpuCount = os.availableParallelism?.() ?? os.cpus().length;
const parallelism = Math.max(cpuCount, 4);

class TransliterationWorkerPool {
  private readonly workers: WorkerLike[] = [];
  private readonly queue: Array<{
    task: TransliterationTask;
    resolve: (value: string) => void;
    reject: (reason?: unknown) => void;
  }> = [];
  private readonly inFlight = new Map<number, (message: TransliterationResponse) => void>();
  private nextId = 0;

  constructor(size: number) {
    if (!workerCtor) {
      throw new Error('Worker constructor is unavailable in this runtime.');
    }
    for (let i = 0; i < size; i++) {
      const worker = new workerCtor(workerScriptUrl, { type: 'module' }) as WorkerLike;
      worker.onmessage = (event: any) => {
        const handler = this.inFlight.get(event.data.id);
        if (handler) {
          handler(event.data);
          this.inFlight.delete(event.data.id);
        }
        this.markBusy(worker, false);
        this.runNext();
      };
      worker.onerror = (error) => {
        // If a worker blows up, fail the associated task and replace the worker.
        this.failAll(error);
        this.replaceWorker(worker);
      };
      this.workers.push(worker);
    }
  }

  run(task: TransliterationTask): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.runNext();
    });
  }

  private runNext() {
    // Process all available idle workers at once for better parallelism
    while (this.queue.length > 0) {
      const idleWorker = this.workers.find((worker) => !this.isBusy(worker));
      if (!idleWorker) {
        break;
      }

      const job = this.queue.shift();
      if (!job) {
        break;
      }

      const id = this.nextId++;
      this.inFlight.set(id, (message) => {
        if (message.error) {
          job.reject(new Error(message.error));
        } else {
          job.resolve(message.result ?? '');
        }
      });

      this.markBusy(idleWorker, true);
      idleWorker.postMessage({ id, ...job.task });
    }
  }

  private isBusy(worker: WorkerLike): boolean {
    return (worker as any).__busy === true;
  }

  private markBusy(worker: WorkerLike, value: boolean) {
    (worker as any).__busy = value;
  }

  private replaceWorker(oldWorker: WorkerLike) {
    const index = this.workers.indexOf(oldWorker);
    if (index >= 0) {
      oldWorker.terminate();
      if (workerCtor) {
        const replacement = new workerCtor(workerScriptUrl, { type: 'module' }) as WorkerLike;
        replacement.onmessage = oldWorker.onmessage;
        replacement.onerror = oldWorker.onerror;
        this.workers[index] = replacement;
      }
    }
  }

  private failAll(error: unknown) {
    this.queue.splice(0).forEach((job) => job.reject(error));
    this.inFlight.forEach((handler) => handler({ id: -1, error: String(error) }));
    this.inFlight.clear();
    this.workers.forEach((worker) => this.markBusy(worker, false));
  }

  async destroy() {
    await Promise.all(this.workers.map((worker) => worker.terminate()));
    this.queue.splice(0);
    this.inFlight.clear();
  }
}

const workerPool =
  workerCtor && parallelism > 1 ? new TransliterationWorkerPool(parallelism) : null;

const transliterateWithWorkers = async (task: TransliterationTask) => {
  if (workerPool) {
    return workerPool.run(task);
  }
  preloadScriptData(task.from);
  preloadScriptData(task.to);
  return transliterate(task.input, task.from, task.to);
};

afterAll(async () => {
  await workerPool?.destroy();
});

describe('Transliteration', () => {
  const yamlFiles = listYamlFiles(TEST_DATA_FOLDER);
  for (const filePath of yamlFiles) {
    const relativePath = path.relative(TEST_DATA_FOLDER, filePath);
    const fileName = path.basename(filePath);
    if (TEST_FILES_TO_IGNORE.includes(relativePath) || TEST_FILES_TO_IGNORE.includes(fileName)) {
      continue;
    }
    const test_data = TestDataTypeSchema.array().parse(parse(fs.readFileSync(filePath, 'utf8')));
    // Use describe.concurrent to allow parallel execution of test suites
    describe.concurrent(
      '⚙️ ' + relativePath.split('/').splice(-1, 1).join('/').split('.')[0],
      () => {
        for (const test_data_item of test_data) {
          it.concurrent(
            `${test_data_item.index} : ${test_data_item.from} ↔ ${test_data_item.to}`,
            async () => {
              const result = await transliterateWithWorkers({
                input: test_data_item.input,
                from: test_data_item.from,
                to: test_data_item.to
              });

              const errorMessage =
                `Transliteration failed:\n` +
                `  From: ${test_data_item.from}\n` +
                `  To: ${test_data_item.to}\n` +
                `  Input: "${test_data_item.input}"\n` +
                `  Expected: "${test_data_item.output}"\n` +
                `  Actual: "${result}"`;
              expect(result, errorMessage).toBe(test_data_item.output);

              if (test_data_item.reversible) {
                const resultReversed = await transliterateWithWorkers({
                  input: result,
                  from: test_data_item.to,
                  to: test_data_item.from
                });
                const errorMessageReversed =
                  `Reversed Transliteration failed:\n` +
                  `  From: ${test_data_item.to}\n` +
                  `  To: ${test_data_item.from}\n` +
                  `  Input: "${result}"\n` +
                  `  Original Input: "${test_data_item.input}"\n` +
                  `  Reversed Output: "${resultReversed}"`;
                expect(resultReversed, errorMessageReversed).toBe(test_data_item.input);
              }
            }
          );
        }
      }
    );
  }
});
