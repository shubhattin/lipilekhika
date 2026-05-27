#pragma once

#include <vector>
#include <optional>
#include <functional>
#include <sys/types.h>

namespace lipilekhika {

template <typename T, typename K, typename Accessor, typename Compare>
std::optional<size_t> binary_search_lower_with_index(
    const std::vector<T>& arr,
    const std::vector<size_t>& index,
    const K& target,
    Accessor accessor,
    Compare compare_fn
) {
    if (index.empty()) return std::nullopt;
    
    ssize_t left = 0;
    ssize_t right = static_cast<ssize_t>(index.size()) - 1;
    std::optional<size_t> result = std::nullopt;

    while (left <= right) {
        ssize_t mid = (left + right) / 2;
        size_t original_idx = index[mid];
        auto value = accessor(arr, original_idx);

        auto cmp = compare_fn(target, value);
        if (cmp == 0) {
            result = original_idx;
            right = mid - 1;
        } else if (cmp < 0) {
            right = mid - 1;
        } else {
            left = mid + 1;
        }
    }

    return result;
}

template <typename T, typename K, typename Accessor, typename Compare>
std::optional<size_t> binary_search_lower(
    const std::vector<T>& arr,
    const K& target,
    Accessor accessor,
    Compare compare_fn
) {
    if (arr.empty()) return std::nullopt;

    ssize_t left = 0;
    ssize_t right = static_cast<ssize_t>(arr.size()) - 1;
    std::optional<size_t> result = std::nullopt;

    while (left <= right) {
        ssize_t mid = (left + right) / 2;
        auto value = accessor(arr, mid);

        auto cmp = compare_fn(target, value);
        if (cmp == 0) {
            result = static_cast<size_t>(mid);
            right = mid - 1;
        } else if (cmp < 0) {
            right = mid - 1;
        } else {
            left = mid + 1;
        }
    }

    return result;
}

} // namespace lipilekhika
