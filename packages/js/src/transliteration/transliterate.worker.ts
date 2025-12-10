import { transliterate, preloadScriptData } from '../index';

type IncomingMessage = {
  id: number;
  input: string;
  from: string;
  to: string;
};

type OutgoingMessage = {
  id: number;
  result?: string;
  error?: string;
};

const ctx: any = self as any;

// Cache preloaded script names to avoid redundant loading
const preloadedScripts = new Set<string>();

// Bun implements the Web Worker API; using onmessage keeps this file portable
// between Bun and environments that understand standard workers.
ctx.onmessage = async (event: { data: IncomingMessage }) => {
  const { id, input, from, to } = event.data;
  try {
    // Only preload if not already cached
    if (!preloadedScripts.has(from)) {
      preloadScriptData(from);
      preloadedScripts.add(from);
    }
    if (!preloadedScripts.has(to)) {
      preloadScriptData(to);
      preloadedScripts.add(to);
    }

    const result = await transliterate(input, from, to);
    ctx.postMessage({ id, result } satisfies OutgoingMessage);
  } catch (error) {
    const message =
      error instanceof Error
        ? (error.stack ?? error.message)
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);
    ctx.postMessage({ id, error: message } satisfies OutgoingMessage);
  }
};
