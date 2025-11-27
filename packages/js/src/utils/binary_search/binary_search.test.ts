import { describe, it, expect } from 'vitest';
import { sortArray, binarySearch } from './binary_search';
import { createSearchIndex, binarySearchWithIndex } from './binary_search';

describe('createSearchIndex', () => {
  it('should create a sorted index for number array', () => {
    const arr = [5, 2, 8, 1, 9, 3];
    const index = createSearchIndex(arr);

    // Index should contain original indices, sorted by their values
    expect(index).toEqual([3, 1, 5, 0, 2, 4]); // [1, 2, 3, 5, 8, 9] -> indices [3, 1, 5, 0, 2, 4]
  });

  it('should create a sorted index for Hindi string array', () => {
    const arr = ['नमस्ते', 'धन्यवाद', 'स्वागत', 'शुभ'];
    const index = createSearchIndex(arr);

    // Verify the index points to sorted values
    const sortedValues = index.map((i) => arr[i]);
    expect(sortedValues).toEqual(arr.sort());
  });

  it('should handle empty array', () => {
    const arr: number[] = [];
    const index = createSearchIndex(arr);
    expect(index).toEqual([]);
  });

  it('should handle single element array', () => {
    const arr = [42];
    const index = createSearchIndex(arr);
    expect(index).toEqual([0]);
  });

  it('should handle array with duplicate values', () => {
    const arr = [3, 1, 3, 2, 1];
    const index = createSearchIndex(arr);

    // Should still create valid index
    const sortedValues = index.map((i) => arr[i]);
    expect(sortedValues).toEqual(arr.sort((a, b) => a - b));
  });
});

describe('binarySearchWithIndex', () => {
  describe('Number arrays', () => {
    it('should find existing element in number array', () => {
      const arr = [5, 2, 8, 1, 9, 3];
      const index = createSearchIndex(arr);

      arr.forEach((v, i) => {
        expect(binarySearchWithIndex(arr, index, v)).toBe(i);
      });
    });

    it('should return -1 for non-existent element in number array', () => {
      const arr = [5, 2, 8, 1, 9, 3];
      const index = createSearchIndex(arr);

      expect(binarySearchWithIndex(arr, index, 0)).toBe(-1);
      expect(binarySearchWithIndex(arr, index, 4)).toBe(-1);
      expect(binarySearchWithIndex(arr, index, 10)).toBe(-1);
    });

    it('should handle single element array', () => {
      const arr = [42];
      const index = createSearchIndex(arr);

      expect(binarySearchWithIndex(arr, index, 42)).toBe(0);
      expect(binarySearchWithIndex(arr, index, 41)).toBe(-1);
    });

    it('should handle empty array', () => {
      const arr: number[] = [];
      const index = createSearchIndex(arr);

      expect(binarySearchWithIndex(arr, index, 5)).toBe(-1);
    });
  });

  describe('Hindi string arrays', () => {
    it('should find existing element in Hindi string array', () => {
      const arr = ['नमस्ते', 'धन्यवाद', 'स्वागत', 'शुभ'];
      const index = createSearchIndex(arr);

      arr.forEach((v, i) => {
        expect(binarySearchWithIndex(arr, index, v)).toBe(i);
      });

      // Verify the returned indices are correct
      const foundIdx1 = binarySearchWithIndex(arr, index, 'नमस्ते');
      expect(arr[foundIdx1]).toBe('नमस्ते');

      const foundIdx2 = binarySearchWithIndex(arr, index, 'धन्यवाद');
      expect(arr[foundIdx2]).toBe('धन्यवाद');
    });

    it('should return -1 for non-existent element in Hindi string array', () => {
      const arr = ['नमस्ते', 'धन्यवाद', 'स्वागत'];
      const index = createSearchIndex(arr);

      expect(binarySearchWithIndex(arr, index, 'दा')).toBe(-1);
      expect(binarySearchWithIndex(arr, index, 'शुभ')).toBe(-1);
    });
  });

  describe('Mixed Indian language strings', () => {
    it('should handle mixed Hindi and Telugu strings', () => {
      const arr = ['नमस्ते', 'నమస్కారం', 'धन्यवाद', 'ధన్యవాదాలు'];
      const index = createSearchIndex(arr);

      arr.forEach((v, i) => {
        expect(binarySearchWithIndex(arr, index, v)).toBe(i);
      });

      const foundIdx1 = binarySearchWithIndex(arr, index, 'नमस्ते');
      expect(arr[foundIdx1]).toBe('नमस्ते');
    });
  });

  describe('Mixed Array with blank strings', () => {
    it('should handle array with one empty string', () => {
      const arr = [''];
      const index = createSearchIndex(arr);

      expect(binarySearchWithIndex(arr, index, '')).toBe(0);
      expect(binarySearchWithIndex(arr, index, 'a')).toBe(-1);
      expect(binarySearchWithIndex(arr, index, 'नमस्ते')).toBe(-1);
    });

    it('should handle array with two empty strings', () => {
      const arr = ['', ''];
      const index = createSearchIndex(arr);

      // Should find one of the empty strings
      const foundIdx = binarySearchWithIndex(arr, index, '');
      expect(foundIdx).toBeGreaterThanOrEqual(0);
      expect(arr[foundIdx]).toBe('');
      expect(binarySearchWithIndex(arr, index, 'a')).toBe(-1);
    });

    it('should handle array with three empty strings', () => {
      const arr = ['', '', ''];
      const index = createSearchIndex(arr);

      // Should find one of the empty strings
      const foundIdx = binarySearchWithIndex(arr, index, '');
      expect(foundIdx).toBeGreaterThanOrEqual(0);
      expect(arr[foundIdx]).toBe('');
      expect(binarySearchWithIndex(arr, index, 'a')).toBe(-1);
      expect(binarySearchWithIndex(arr, index, 'नमस्ते')).toBe(-1);
    });

    it('should handle empty strings mixed with Hindi strings', () => {
      const arr = ['नमस्ते', '', 'धन्यवाद', '', 'स्वागत'];
      const index = createSearchIndex(arr);

      // Verify empty strings can be found
      const foundIdx1 = binarySearchWithIndex(arr, index, '');
      expect(foundIdx1).toBeGreaterThanOrEqual(0);
      expect(arr[foundIdx1]).toBe('');

      // Verify Hindi strings can still be found
      expect(binarySearchWithIndex(arr, index, 'नमस्ते')).toBe(0);
      expect(binarySearchWithIndex(arr, index, 'धन्यवाद')).toBe(2);
      expect(binarySearchWithIndex(arr, index, 'स्वागत')).toBe(4);
    });

    it('should handle empty strings mixed with Telugu strings', () => {
      const arr = ['నమస్కారం', '', 'ధన్యవాదాలు', '', 'స్వాగతం'];
      const index = createSearchIndex(arr);

      // Verify empty strings can be found
      const foundIdx1 = binarySearchWithIndex(arr, index, '');
      expect(foundIdx1).toBeGreaterThanOrEqual(0);
      expect(arr[foundIdx1]).toBe('');

      // Verify Telugu strings can still be found
      expect(binarySearchWithIndex(arr, index, 'నమస్కారం')).toBe(0);
      expect(binarySearchWithIndex(arr, index, 'ధన్యవాదాలు')).toBe(2);
      expect(binarySearchWithIndex(arr, index, 'స్వాగతం')).toBe(4);
    });

    it('should handle empty strings mixed with both Hindi and Telugu strings', () => {
      const arr = ['नमस्ते', '', 'నమస్కారం', '', 'धन्यवाद'];
      const index = createSearchIndex(arr);

      // Verify empty strings can be found
      const foundIdx1 = binarySearchWithIndex(arr, index, '');
      expect(foundIdx1).toBeGreaterThanOrEqual(0);
      expect(arr[foundIdx1]).toBe('');

      // Verify all non-empty strings can be found
      expect(binarySearchWithIndex(arr, index, 'नमस्ते')).toBe(0);
      expect(binarySearchWithIndex(arr, index, 'నమస్కారం')).toBe(2);
      expect(binarySearchWithIndex(arr, index, 'धन्यवाद')).toBe(4);
    });

    it('should handle array starting with empty string', () => {
      const arr = ['', 'नमस्ते', 'धन्यवाद'];
      const index = createSearchIndex(arr);

      expect(binarySearchWithIndex(arr, index, '')).toBe(0);
      expect(binarySearchWithIndex(arr, index, 'नमस्ते')).toBe(1);
      expect(binarySearchWithIndex(arr, index, 'धन्यवाद')).toBe(2);
    });

    it('should handle array ending with empty string', () => {
      const arr = ['नमस्ते', 'धन्यवाद', ''];
      const index = createSearchIndex(arr);

      const foundIdx = binarySearchWithIndex(arr, index, '');
      expect(foundIdx).toBe(2);
      expect(binarySearchWithIndex(arr, index, 'नमस्ते')).toBe(0);
      expect(binarySearchWithIndex(arr, index, 'धन्यवाद')).toBe(1);
    });

    it('should handle array with empty strings at both ends', () => {
      const arr = ['', 'नमस्ते', ''];
      const index = createSearchIndex(arr);

      const foundIdx1 = binarySearchWithIndex(arr, index, '');
      expect(foundIdx1).toBeGreaterThanOrEqual(0);
      expect(arr[foundIdx1]).toBe('');

      expect(binarySearchWithIndex(arr, index, 'नमस्ते')).toBe(1);
    });

    it('should return -1 for non-empty string when searching in array with only empty strings', () => {
      const arr = ['', '', ''];
      const index = createSearchIndex(arr);

      expect(binarySearchWithIndex(arr, index, 'a')).toBe(-1);
      expect(binarySearchWithIndex(arr, index, 'नमस्ते')).toBe(-1);
      expect(binarySearchWithIndex(arr, index, ' ')).toBe(-1);
    });
  });

  describe('Lower bound behavior with duplicates', () => {
    it('should return lower bound index for duplicates in unsorted array', () => {
      // Array: [3, 1, 3, 2, 1] -> sorted values: [1, 1, 2, 3, 3] -> sorted indices: [1, 4, 3, 0, 2]
      const arr = [3, 1, 3, 2, 1];
      const index = createSearchIndex(arr);

      // For value 1: first in sorted order is at original index 1 (arr[1] = 1)
      // The index array's first 1 is index[0] which should be 1 or 4 (both have value 1)
      // Lower bound should return the first one encountered in sorted order
      const foundIdx1 = binarySearchWithIndex(arr, index, 1);
      expect(arr[foundIdx1]).toBe(1);
      expect(foundIdx1).toBe(index[0]); // Should be the first 1 in sorted order

      // For value 3: sorted order has two 3s
      const foundIdx3 = binarySearchWithIndex(arr, index, 3);
      expect(arr[foundIdx3]).toBe(3);
      // Should return the first 3 in sorted order (which is at index[3] in the sorted index)
      expect(foundIdx3).toBe(index[3]);
    });

    it('should return lower bound for array with all same values', () => {
      const arr = [5, 5, 5, 5];
      const index = createSearchIndex(arr);

      const foundIdx = binarySearchWithIndex(arr, index, 5);
      expect(foundIdx).toBe(index[0]); // Should return the first in sorted order
    });

    it('should return lower bound for consecutive duplicates', () => {
      // Original: [7, 2, 2, 2, 9] - indices 1,2,3 all have value 2
      const arr = [7, 2, 2, 2, 9];
      const index = createSearchIndex(arr);

      // Sorted: [2, 2, 2, 7, 9] -> index should be something like [1, 2, 3, 0, 4]
      const foundIdx = binarySearchWithIndex(arr, index, 2);
      expect(arr[foundIdx]).toBe(2);
      expect(foundIdx).toBe(index[0]); // First 2 in sorted order
    });

    it('should return lower bound with custom accessor for duplicates', () => {
      const arr = [
        { key: 'c', val: 3 },
        { key: 'a', val: 1 },
        { key: 'a', val: 2 },
        { key: 'b', val: 4 }
      ];
      const accessor = (arr: readonly { key: string; val: number }[], i: number) => arr[i].key;
      const index = createSearchIndex(arr, { accessor });

      // Two elements have key 'a' (indices 1 and 2)
      const foundIdx = binarySearchWithIndex(arr, index, 'a', { accessor });
      expect(arr[foundIdx].key).toBe('a');
      expect(foundIdx).toBe(index[0]); // First 'a' in sorted order
    });
  });

  describe('Edge cases', () => {
    it('should handle array with duplicate values', () => {
      const arr = [3, 1, 3, 2, 1];
      const index = createSearchIndex(arr);

      // Should find the duplicates
      const foundIdx = binarySearchWithIndex(arr, index, 3);
      expect(foundIdx).toBeGreaterThanOrEqual(0);
      expect(arr[foundIdx]).toBe(3);

      const foundIdx2 = binarySearchWithIndex(arr, index, 1);
      expect(foundIdx2).toBeGreaterThanOrEqual(0);
      expect(arr[foundIdx2]).toBe(1);
    });

    it('should handle already sorted array', () => {
      const arr = [1, 2, 3, 4, 5];
      const index = createSearchIndex(arr);

      expect(binarySearchWithIndex(arr, index, 3)).toBe(2);
      expect(binarySearchWithIndex(arr, index, 1)).toBe(0);
      expect(binarySearchWithIndex(arr, index, 5)).toBe(4);
    });

    it('should handle reverse sorted array', () => {
      const arr = [5, 4, 3, 2, 1];
      const index = createSearchIndex(arr);

      expect(binarySearchWithIndex(arr, index, 3)).toBe(2);
      expect(binarySearchWithIndex(arr, index, 1)).toBe(4);
      expect(binarySearchWithIndex(arr, index, 5)).toBe(0);
    });
  });

  describe('Custom Array Type', () => {
    it('should handle custom array type', () => {
      const arr = [
        ['z', { next: 'b' }],
        ['c', { next: 'c' }],
        ['a', { next: null }]
      ];
      const index = createSearchIndex(arr, { accessor: (arr, i) => arr[i][0] });

      expect(binarySearchWithIndex(arr, index, 'a', { accessor: (arr, i) => arr[i][0] })).toBe(2);
      expect(binarySearchWithIndex(arr, index, 'c', { accessor: (arr, i) => arr[i][0] })).toBe(1);
      expect(binarySearchWithIndex(arr, index, 'j', { accessor: (arr, i) => arr[i][0] })).toBe(-1);
      expect(binarySearchWithIndex(arr, index, 'z', { accessor: (arr, i) => arr[i][0] })).toBe(0);
    });
  });
});

describe('sort', () => {
  it('should sort a number array', () => {
    const arr = [5, 2, 8, 1, 9, 3];
    expect(sortArray(arr)).toEqual([1, 2, 3, 5, 8, 9]);
  });

  it('should sort a string array', () => {
    const arr = ['banana', 'apple', 'carrot', 'berry'];
    expect(sortArray(arr)).toEqual(['apple', 'banana', 'berry', 'carrot']);
  });

  it('should handle empty array', () => {
    expect(sortArray([])).toEqual([]);
  });

  it('should handle single element array', () => {
    expect(sortArray([42])).toEqual([42]);
  });

  it('should handle array with duplicate values', () => {
    const arr = [3, 1, 3, 2, 1];
    expect(sortArray(arr)).toEqual([1, 1, 2, 3, 3]);
  });

  it('should handle array of objects with accessor', () => {
    const arr = [{ score: 2 }, { score: 1 }, { score: 3 }];
    expect(sortArray(arr, { accessor: (arr, i) => arr[i].score })).toEqual([
      { score: 1 },
      { score: 2 },
      { score: 3 }
    ]);
  });

  it('should sort with custom comparator', () => {
    const arr = [1, 2, 3, 4];
    expect(sortArray(arr, { compareFn: (a, b) => b - a })).toEqual([4, 3, 2, 1]);
  });

  it('should sort array of objects by string property using accessor', () => {
    const arr = [{ name: 'banana' }, { name: 'apple' }, { name: 'carrot' }];
    expect(sortArray(arr, { accessor: (arr, i) => arr[i].name })).toEqual([
      { name: 'apple' },
      { name: 'banana' },
      { name: 'carrot' }
    ]);
  });
});

describe('binarySearch', () => {
  it('should find target in sorted number array', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(binarySearch(arr, 3)).toBe(2);
    expect(binarySearch(arr, 1)).toBe(0);
    expect(binarySearch(arr, 5)).toBe(4);
  });

  it('should return -1 for missing element in sorted number array', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(binarySearch(arr, 0)).toBe(-1);
    expect(binarySearch(arr, 6)).toBe(-1);
  });

  it('should work with custom accessor', () => {
    const arr = [{ v: 1 }, { v: 3 }, { v: 7 }];
    expect(binarySearch(arr, 3, { accessor: (arr, i) => arr[i].v })).toBe(1);
    expect(binarySearch(arr, 4, { accessor: (arr, i) => arr[i].v })).toBe(-1);
  });

  it('should work with custom compareFn (descending search)', () => {
    const arr = [5, 4, 3, 2, 1];
    expect(binarySearch(arr, 2, { compareFn: (a, b) => b - a })).toBe(3);
    expect(binarySearch(arr, 6, { compareFn: (a, b) => b - a })).toBe(-1);
  });

  it('should handle sorted string arrays', () => {
    const arr = ['apple', 'banana', 'carrot'];
    expect(binarySearch(arr, 'banana')).toBe(1);
    expect(binarySearch(arr, 'zzz')).toBe(-1);
  });

  it('should handle single element array', () => {
    expect(binarySearch([42], 42)).toBe(0);
    expect(binarySearch([42], 24)).toBe(-1);
  });

  it('should handle empty array', () => {
    expect(binarySearch([], 42)).toBe(-1);
  });

  it('should return the first (lower bound) index for duplicate elements', () => {
    // Test duplicates in the middle
    const arr1 = [1, 2, 2, 2, 3];
    expect(binarySearch(arr1, 2)).toBe(1); // First occurrence of 2

    // Test duplicates at the start
    const arr2 = [1, 1, 1, 2, 3];
    expect(binarySearch(arr2, 1)).toBe(0); // First occurrence of 1

    // Test duplicates at the end
    const arr3 = [1, 2, 3, 3, 3];
    expect(binarySearch(arr3, 3)).toBe(2); // First occurrence of 3

    // Test all same elements
    const arr4 = [5, 5, 5, 5, 5];
    expect(binarySearch(arr4, 5)).toBe(0); // First occurrence

    // Test two duplicates
    const arr5 = [1, 2, 2, 3];
    expect(binarySearch(arr5, 2)).toBe(1); // First occurrence of 2
  });

  it('should return lower bound with custom accessor for duplicates', () => {
    const arr = [{ v: 1 }, { v: 2 }, { v: 2 }, { v: 2 }, { v: 3 }];
    const idx = binarySearch(arr, 2, { accessor: (arr, i) => arr[i].v });
    expect(idx).toBe(1); // First occurrence of v=2
  });

  it('should work with objects and both accessor and compareFn', () => {
    // Sort descending by value
    const arr = [{ v: 3 }, { v: 2 }, { v: 1 }];
    expect(
      binarySearch(arr, 2, {
        accessor: (arr, i) => arr[i].v,
        compareFn: (a, b) => b - a
      })
    ).toBe(1);
  });
});
