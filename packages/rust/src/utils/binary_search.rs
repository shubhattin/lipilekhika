use core::cmp::Ordering;

#[allow(dead_code)]
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

#[allow(dead_code)]
pub fn binary_search_lower<'a, T, K, F, C>(
    arr: &'a [T],
    target: &K,
    accessor: F,
    compare_fn: C,
) -> Option<usize>
where
    F: Fn(&'a [T], usize) -> K,
    C: Fn(&K, &K) -> Ordering,
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
