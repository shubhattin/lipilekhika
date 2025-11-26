type Accessor<T, K> = (arr: readonly T[], i: number) => K;
type CompareFn<K> = (a: K, b: K) => number;

interface SearchIndexOptions<T, K> {
  accessor?: Accessor<T, K>;
  compareFn?: CompareFn<K>;
}

/**
 * Creates a sorted index for binary search on an unsorted array.
 */
export function createSearchIndex<T, K = T>(
  arr: readonly T[],
  options?: SearchIndexOptions<T, K>
): number[] {
  const { accessor, compareFn } = options ?? {};
  const get = accessor ?? ((arr, i) => arr[i] as unknown as K);

  const indices = Array.from({ length: arr.length }, (_, i) => i);

  indices.sort((a, b) => {
    const valA = get(arr, a);
    const valB = get(arr, b);

    if (compareFn) {
      return compareFn(valA, valB);
    }

    // Default comparison for primitives
    if (valA < valB) return -1;
    if (valA > valB) return 1;
    return 0;
  });

  return indices;
}

/**
 * Performs binary search(lower bound) using a pre-built index.
 */
export function binarySearchWithIndex<T, K = T>(
  arr: readonly T[],
  index: readonly number[],
  target: K,
  options?: SearchIndexOptions<T, K>
): number {
  const { accessor, compareFn } = options ?? {};
  const get = accessor ?? ((arr, i) => arr[i] as unknown as K);

  let left = 0;
  let right = index.length - 1;
  let result = -1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const originalIdx = index[mid];
    const value = get(arr, originalIdx);

    let cmp: number;
    if (compareFn) {
      cmp = compareFn(target, value);
    } else {
      cmp = target < value ? -1 : target > value ? 1 : 0;
    }

    if (cmp === 0) {
      result = originalIdx;
      right = mid - 1;
    } else if (cmp < 0) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return result;
}

/**
 * Sorts an array using the provided accessor and compare functions.
 * Returns a new sorted array.
 */
export function sortArray<T, K = T>(arr: readonly T[], options?: SearchIndexOptions<T, K>): T[] {
  const { accessor, compareFn } = options ?? {};
  const get = accessor ?? ((arr, i) => arr[i] as unknown as K);

  // Create array with indices, sort by the accessor value, then map to elements
  const indices = Array.from({ length: arr.length }, (_, i) => i);

  indices.sort((a, b) => {
    const valA = get(arr, a);
    const valB = get(arr, b);

    if (compareFn) {
      return compareFn(valA, valB);
    }

    // Default comparison for primitives
    if (valA < valB) return -1;
    if (valA > valB) return 1;
    return 0;
  });

  return indices.map((i) => arr[i]);
}

/**
 * Performs binary search(lower bound) on a sorted array.
 * Returns the index of the target element, or -1 if not found.
 */
export function binarySearch<T, K = T>(
  arr: readonly T[],
  target: K,
  options?: SearchIndexOptions<T, K>
): number {
  const { accessor, compareFn } = options ?? {};
  const get = accessor ?? ((arr, i) => arr[i] as unknown as K);

  let left = 0;
  let right = arr.length - 1;
  let result = -1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const value = get(arr, mid);

    let cmp: number;
    if (compareFn) {
      cmp = compareFn(target, value);
    } else {
      cmp = target < value ? -1 : target > value ? 1 : 0;
    }

    if (cmp === 0) {
      result = mid;
      right = mid - 1;
    } else if (cmp < 0) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return result;
}
