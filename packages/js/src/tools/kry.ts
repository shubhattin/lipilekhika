export function copy_plain_object<T>(obj: T) {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export function get_permutations(range: [number, number], count: number = 1): number[][] {
  const [start, end] = range;
  const numbers: number[] = Array.from({ length: end - start + 1 }, (_, i) => i + start);
  function shuffle(array: number[]): number[] {
    const shuffled = array.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  const permutations: number[][] = [];
  for (let i = 0; i < count; i++) {
    permutations.push(shuffle(numbers));
  }
  return permutations;
}

/**
 * This replaces `{key}` with the corresponding value in `options`
 */
export function format_string_text(text: string, options: Record<string, any>) {
  return text.replace(/{(\w+)}/g, (_, key) => options[key] ?? `{${key}}`);
}

export function cleanUpWhitespace(input: string, replace_multiple_white_spaces = true): string {
  input = input.trim();
  if (replace_multiple_white_spaces) input = input.replace(/\s+/g, ' ');
  return input;
}

export function get_randon_number(start: number, end: number) {
  return Math.floor(Math.random() * (end - start + 1) + start);
}

/**
 * Deeply clones a value of type T.
 * - Primitives are returned as-is.
 * - Arrays and plain objects are recursively cloned.
 * - Date, Map, Set are specially handled.
 * - Other objects (e.g. functions, class instances) are returned by reference.
 */
export function deepCopy<T>(value: T): T {
  // Primitives (and functions) are returned directly
  if (value === null || typeof value !== 'object') {
    return value;
  }
  // Date
  if (value instanceof Date) {
    return new Date(value.getTime()) as any;
  }
  // Array
  if (Array.isArray(value)) {
    const arrCopy = [] as unknown[];
    for (const item of value) {
      arrCopy.push(deepCopy(item));
    }
    return arrCopy as any;
  }
  // Map
  if (value instanceof Map) {
    const mapCopy = new Map();
    for (const [k, v] of value.entries()) {
      mapCopy.set(deepCopy(k), deepCopy(v));
    }
    return mapCopy as any;
  }
  // Set
  if (value instanceof Set) {
    const setCopy = new Set();
    for (const v of value.values()) {
      setCopy.add(deepCopy(v));
    }
    return setCopy as any;
  }
  // Plain Object
  if (Object.getPrototypeOf(value) === Object.prototype) {
    const objCopy: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      objCopy[k] = deepCopy(v);
    }
    return objCopy as T;
  }
  // Fallback: other object types (class instances, functions, etc.)
  return value;
}

export const get_rand_num = (a: number, b: number) => {
  return Math.trunc(Math.random() * (b - a + 1)) + a;
};
