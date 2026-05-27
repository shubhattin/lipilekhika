#pragma once

#include <string>
#include <string_view>

namespace lipilekhika {

inline std::string_view char_substring(std::string_view s, size_t start, size_t end) {
    if (start >= end) {
        return "";
    }

    size_t byte_idx = 0;
    size_t char_count = 0;
    size_t start_byte = std::string_view::npos;
    size_t end_byte = std::string_view::npos;

    while (byte_idx < s.size()) {
        unsigned char c = s[byte_idx];
        // If it's a lead byte of a UTF-8 character (not a continuation byte)
        if ((c & 0xC0) != 0x80) {
            if (char_count == start) {
                start_byte = byte_idx;
            }
            if (char_count == end) {
                end_byte = byte_idx;
                break;
            }
            char_count++;
        }
        byte_idx++;
    }

    if (start_byte == std::string_view::npos) {
        return "";
    }
    if (end_byte == std::string_view::npos) {
        if (char_count >= end) {
            end_byte = byte_idx;
        } else {
            end_byte = s.size();
        }
    }

    return s.substr(start_byte, end_byte - start_byte);
}

} // namespace lipilekhika
