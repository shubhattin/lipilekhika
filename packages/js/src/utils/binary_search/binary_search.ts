/**
 * Creates a sorted index for binary search on an unsorted array.
 * The index contains the original array indices, sorted by their values.
 *
 * @param arr - The original unsorted array
 * @returns Array of indices, sorted by the values they point to
 */
export function createSearchIndex<T>(arr: readonly T[]): number[] {
  // Create array of indices [0, 1, 2, ..., n-1]
  const indices = Array.from({ length: arr.length }, (_, i) => i);

  // Sort indices based on the values they point to
  indices.sort((a, b) => {
    const valA = arr[a];
    const valB = arr[b];

    if (valA < valB) return -1;
    if (valA > valB) return 1;
    return 0;
  });

  return indices;
}

/**
 * Performs binary search using a pre-built index.
 *
 * @param arr - The original unsorted array
 * @param index - The sorted index created by createSearchIndex
 * @param target - The value to search for
 * @returns The index in the original array, or -1 if not found
 */
export function binarySearchWithIndex<T>(
  arr: readonly T[],
  index: readonly number[],
  target: T
): number {
  let left = 0;
  let right = index.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const originalIdx = index[mid];
    const value = arr[originalIdx];

    if (value === target) {
      return originalIdx; // Return original array index
    }

    if (target < value) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return -1; // Not found
}
