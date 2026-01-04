use std::cmp::Ordering;

pub fn binary_search_lower_with_index<'a, T, K, F, C>(
  arr: &'a [T],
  index: &'a [usize],
  target: &K,
  accessor: F,
  compare_fn: C,
) -> Option<usize>
where
  F: Fn(&'a [T], usize) -> K,
  C: Fn(&K, &K) -> Ordering,
{
  let mut left: isize = 0;
  let mut right: isize = index.len() as isize - 1;
  let mut result: Option<usize> = None;

  while left <= right {
    let mid = (left + right) / 2;
    let original_idx = index[mid as usize];
    let value = accessor(arr, original_idx);

    match compare_fn(target, &value) {
      Ordering::Equal => {
        result = Some(original_idx);
        right = mid - 1;
      }
      Ordering::Less => {
        right = mid - 1;
      }
      Ordering::Greater => {
        left = mid + 1;
      }
    }
  }

  result
}

pub fn binary_search_lower<'a, T, K, F, C>(
  arr: &'a [T],
  target: &K,
  mut accessor: F,
  mut compare_fn: C,
) -> Option<usize>
where
  F: FnMut(&'a [T], usize) -> K,
  C: FnMut(&K, &K) -> Ordering,
{
  let mut left: isize = 0;
  let mut right: isize = arr.len() as isize - 1;
  let mut result: Option<usize> = None;

  while left <= right {
    let mid = (left + right) / 2;
    let value = accessor(arr, mid as usize);

    match compare_fn(target, &value) {
      Ordering::Equal => {
        result = Some(mid as usize);
        right = mid - 1;
      }
      Ordering::Less => {
        right = mid - 1;
      }
      Ordering::Greater => {
        left = mid + 1;
      }
    }
  }

  result
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn binary_search_lower_finds_existing_element() {
    let arr = [1, 2, 3, 4, 5];

    let accessor = |a: &[i32], i: usize| a[i];
    let cmp = |a: &i32, b: &i32| a.cmp(b);

    let idx = binary_search_lower(&arr, &3, accessor, cmp);
    assert_eq!(idx, Some(2));
  }

  #[test]
  fn binary_search_lower_returns_none_when_not_found() {
    let arr = [1, 2, 3, 4, 5];

    let accessor = |a: &[i32], i: usize| a[i];
    let cmp = |a: &i32, b: &i32| a.cmp(b);

    let idx = binary_search_lower(&arr, &0, accessor, cmp);
    assert_eq!(idx, None);

    let idx = binary_search_lower(&arr, &6, accessor, cmp);
    assert_eq!(idx, None);
  }

  #[test]
  fn binary_search_lower_returns_first_match_for_duplicates() {
    let arr = [1, 2, 2, 2, 3];

    let accessor = |a: &[i32], i: usize| a[i];
    let cmp = |a: &i32, b: &i32| a.cmp(b);

    let idx = binary_search_lower(&arr, &2, accessor, cmp);
    assert_eq!(idx, Some(1));
  }

  #[test]
  fn binary_search_lower_with_index_finds_existing_element_in_unsorted_array() {
    let arr = [30, 10, 20, 20];

    // Build index the same way as JS createSearchIndex would.
    let mut index: Vec<usize> = (0..arr.len()).collect();
    index.sort_by(|&a, &b| arr[a].cmp(&arr[b]));

    let accessor = |a: &[i32], i: usize| a[i];
    let cmp = |a: &i32, b: &i32| a.cmp(b);

    let idx = binary_search_lower_with_index(&arr, &index, &20, accessor, cmp);

    // The first 20 in sorted order corresponds to original index 2.
    assert_eq!(idx, Some(2));
  }

  #[test]
  fn binary_search_lower_with_index_returns_none_when_not_found() {
    let arr = [30, 10, 20, 20];

    let mut index: Vec<usize> = (0..arr.len()).collect();
    index.sort_by(|&a, &b| arr[a].cmp(&arr[b]));

    let accessor = |a: &[i32], i: usize| a[i];
    let cmp = |a: &i32, b: &i32| a.cmp(b);

    let idx = binary_search_lower_with_index(&arr, &index, &25, accessor, cmp);
    assert_eq!(idx, None);
  }

  #[test]
  fn binary_search_lower_with_index_handles_empty_index() {
    let arr: [i32; 0] = [];
    let index: [usize; 0] = [];

    let accessor = |a: &[i32], i: usize| a[i];
    let cmp = |a: &i32, b: &i32| a.cmp(b);

    let idx = binary_search_lower_with_index(&arr, &index, &10, accessor, cmp);
    assert_eq!(idx, None);
  }
}
