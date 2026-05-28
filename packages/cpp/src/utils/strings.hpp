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

inline std::string_view get_first_utf8_char(std::string_view s) {
    if (s.empty()) return "";
    unsigned char c = s[0];
    size_t len = 1;
    if ((c & 0x80) == 0) len = 1;
    else if ((c & 0xE0) == 0xC0) len = 2;
    else if ((c & 0xF0) == 0xE0) len = 3;
    else if ((c & 0xF8) == 0xF0) len = 4;
    if (len > s.size()) len = s.size();
    return s.substr(0, len);
}

inline std::string_view get_last_utf8_char(std::string_view s) {
    if (s.empty()) return "";
    size_t idx = s.length();
    while (idx > 0) {
        idx--;
        unsigned char c = s[idx];
        if ((c & 0xC0) != 0x80) {
            return s.substr(idx);
        }
    }
    return "";
}

inline size_t utf8_char_count(std::string_view s) {
    size_t count = 0;
    for (char c : s) {
        if ((static_cast<unsigned char>(c) & 0xC0) != 0x80) {
            count++;
        }
    }
    return count;
}

} // namespace lipilekhika

