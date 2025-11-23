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

export function get_random_number(start: number, end: number) {
  return Math.floor(Math.random() * (end - start + 1)) + start;
}

/**
 * Deeply clones a value of type T.
 * - Primitives are returned as-is.
 * - Arrays and plain objects (including null prototypes) are recursively cloned.
 * - Date, Map, Set are specially handled.
 * - Cyclic structures are supported via a WeakMap cache.
 * - Other objects (e.g. functions, class instances) are returned by reference.
 */
export function deepCopy<T>(value: T, visited: WeakMap<object, unknown> = new WeakMap()): T {
  // Primitives (and functions) are returned directly
  if (value === null || typeof value !== 'object') {
    return value;
  }
  const cached = visited.get(value as object);
  if (cached !== undefined) {
    return cached as T;
  }
  // Date
  if (value instanceof Date) {
    const dateCopy = new Date(value.getTime()) as unknown;
    visited.set(value, dateCopy);
    return dateCopy as T;
  }
  // Array
  if (Array.isArray(value)) {
    const arrCopy = [] as unknown[];
    visited.set(value, arrCopy);
    for (const item of value) {
      arrCopy.push(deepCopy(item, visited));
    }
    return arrCopy as unknown as T;
  }
  // Map
  if (value instanceof Map) {
    const mapCopy = new Map();
    visited.set(value, mapCopy);
    for (const [k, v] of value.entries()) {
      mapCopy.set(deepCopy(k, visited), deepCopy(v, visited));
    }
    return mapCopy as unknown as T;
  }
  // Set
  if (value instanceof Set) {
    const setCopy = new Set();
    visited.set(value, setCopy);
    for (const v of value.values()) {
      setCopy.add(deepCopy(v, visited));
    }
    return setCopy as unknown as T;
  }
  // Plain Object
  const prototype = Object.getPrototypeOf(value);
  if (prototype === Object.prototype || prototype === null) {
    const objCopy: Record<string, unknown> = {};
    visited.set(value, objCopy);
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      objCopy[k] = deepCopy(v, visited);
    }
    return objCopy as T;
  }
  // Fallback: other object types (class instances, functions, etc.)
  return value;
}

export function toUnicodeEscapes(input: string): string {
  let result = '';
  for (const char of input) {
    const code = char.codePointAt(0)!;
    const prefix = '\\u'; // produces actual \u in the output

    if (code <= 0xffff) {
      result += prefix + code.toString(16).padStart(4, '0');
    } else {
      const high = Math.floor((code - 0x10000) / 0x400) + 0xd800;
      const low = ((code - 0x10000) % 0x400) + 0xdc00;
      result += prefix + high.toString(16).padStart(4, '0');
      result += prefix + low.toString(16).padStart(4, '0');
    }
  }
  return result;
}
