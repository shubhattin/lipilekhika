#pragma once

#include <string>
#include <vector>
#include <deque>
#include <optional>
#include <string_view>
#include <utility>
#include <algorithm>
#include "../script_data/script_data.hpp"

namespace lipilekhika {

inline std::string_view krama_text_or_empty(const ScriptData& data, int16_t idx) {
    if (idx < 0) return "";
    const auto& arr = get_common_attr(data).krama_text_arr;
    if (static_cast<size_t>(idx) < arr.size()) {
        return arr[idx].text;
    }
    return "";
}

inline std::optional<std::string_view> krama_text_or_null(const ScriptData& data, int16_t idx) {
    if (idx < 0) return std::nullopt;
    const auto& arr = get_common_attr(data).krama_text_arr;
    if (static_cast<size_t>(idx) < arr.size()) {
        return arr[idx].text;
    }
    return std::nullopt;
}

inline std::vector<std::string> replace_with_pieces(const ScriptData& data, const std::vector<int16_t>& replace_with) {
    std::vector<std::string> result;
    for (int16_t k : replace_with) {
        auto piece = krama_text_or_empty(data, k);
        if (!piece.empty()) {
            result.push_back(std::string(piece));
        }
    }
    return result;
}

/// Custom struct to construct output string.
class ResultStringBuilder {
private:
    std::string buf;
    /// Byte offsets marking the start of each "piece" within `buf`.
    std::vector<size_t> offsets;

    std::pair<size_t, size_t> piece_range(size_t i) const {
        size_t start = offsets[i];
        size_t end = (i + 1 < offsets.size()) ? offsets[i + 1] : buf.length();
        return {start, end};
    }

public:
    ResultStringBuilder() {
        buf.reserve(128);
    }

    void emit(std::string_view text) {
        if (text.empty()) {
            return;
        }
        offsets.push_back(buf.length());
        buf.append(text);
    }

    void emit_char(char c) {
        offsets.push_back(buf.length());
        buf.push_back(c);
    }

    void emit_char(std::string_view c) {
        emit(c);
    }

    template <typename S>
    void emit_pieces(const std::vector<S>& pieces) {
        for (const auto& p : pieces) {
            emit(p);
        }
    }

    std::optional<std::string_view> last_piece() const {
        if (offsets.empty()) {
            return std::nullopt;
        }
        size_t i = offsets.size() - 1;
        auto range = piece_range(i);
        return std::string_view(buf).substr(range.first, range.second - range.first);
    }

    std::optional<std::string> last_char() const {
        if (buf.empty()) return std::nullopt;
        size_t idx = buf.length();
        while (idx > 0) {
            idx--;
            unsigned char c = buf[idx];
            if ((c & 0xC0) != 0x80) {
                return buf.substr(idx);
            }
        }
        return std::nullopt;
    }

    std::optional<std::string> pop_last_char() {
        if (buf.empty()) return std::nullopt;
        std::string popped;
        while (!buf.empty()) {
            unsigned char c = buf.back();
            popped.insert(popped.begin(), c);
            buf.pop_back();
            if ((c & 0xC0) != 0x80) {
                break;
            }
        }
        if (!offsets.empty() && offsets.back() >= buf.length() && offsets.back() > 0) {
            offsets.pop_back();
        }
        return popped;
    }

    template <typename S>
    void rewrite_tail_pieces(size_t count, const std::vector<S>& new_pieces) {
        size_t piece_count = offsets.size();
        size_t start = (piece_count > count) ? piece_count - count : 0;
        size_t buf_start = (start < offsets.size()) ? offsets[start] : buf.length();
        buf.resize(buf_start);
        offsets.resize(start);
        for (const auto& p : new_pieces) {
            std::string_view view(p);
            if (!view.empty()) {
                offsets.push_back(buf.length());
                buf.append(view);
            }
        }
    }

    template <typename S, typename T>
    void with_last_char_moved_after(const std::vector<S>& before_pieces, const std::vector<T>& after_pieces) {
        auto ch = pop_last_char();
        emit_pieces(before_pieces);
        if (ch) {
            emit(*ch);
        }
        emit_pieces(after_pieces);
    }

    std::optional<std::string_view> peek_at(ssize_t index) const {
        ssize_t len = static_cast<ssize_t>(offsets.size());
        if (len == 0) {
            return std::nullopt;
        }
        ssize_t i = index;
        if (i < 0) {
            i += len;
            if (i < 0) return std::nullopt;
        } else if (i >= len) {
            return std::nullopt;
        }
        size_t idx = static_cast<size_t>(i);
        auto range = piece_range(idx);
        return std::string_view(buf).substr(range.first, range.second - range.first);
    }

    void rewrite_at(ssize_t index, std::string_view new_piece) {
        ssize_t len = static_cast<ssize_t>(offsets.size());
        if (len == 0) {
            return;
        }
        ssize_t i = index;
        if (i < 0) {
            i += len;
            if (i < 0) return;
        } else if (i >= len) {
            return;
        }
        size_t idx = static_cast<size_t>(i);
        auto range = piece_range(idx);
        size_t old_len = range.second - range.first;
        size_t new_len = new_piece.length();
        ssize_t diff = static_cast<ssize_t>(new_len) - static_cast<ssize_t>(old_len);

        buf.replace(range.first, old_len, new_piece);

        for (size_t k = idx + 1; k < offsets.size(); ++k) {
            offsets[k] = static_cast<size_t>(static_cast<ssize_t>(offsets[k]) + diff);
        }
    }

    std::string str() const {
        return buf;
    }

    template <typename S>
    void emit_pieces_with_reorder(const std::vector<S>& pieces, std::string_view halant, bool should_reorder) {
        if (pieces.empty()) {
            return;
        }
        if (!should_reorder) {
            emit_pieces(pieces);
            return;
        }
        std::string_view first_piece = pieces.front();
        if (first_piece.rfind(halant, 0) == 0) {
            std::string_view rest_first = first_piece.substr(halant.length());
            std::vector<std::string> after_pieces;
            if (!rest_first.empty()) {
                after_pieces.push_back(std::string(rest_first));
            }
            for (size_t i = 1; i < pieces.size(); ++i) {
                after_pieces.push_back(std::string(pieces[i]));
            }
            with_last_char_moved_after(std::vector<std::string>{std::string(halant)}, after_pieces);
        } else {
            with_last_char_moved_after(pieces, std::vector<std::string>{});
        }
    }
};

using PrevContextItem = std::pair<std::optional<std::string>, std::optional<List>>;

class PrevContextBuilder {
private:
    std::deque<PrevContextItem> arr;
    size_t max_len;

    std::optional<size_t> resolve_arr_index(ssize_t i) const {
        if (arr.empty()) return std::nullopt;
        ssize_t len = static_cast<ssize_t>(arr.size());
        ssize_t idx = i;
        if (idx < 0) {
            idx += len;
        }
        if (idx < 0 || idx >= len) {
            return std::nullopt;
        }
        return static_cast<size_t>(idx);
    }

public:
    PrevContextBuilder(size_t max_length) : max_len(max_length) {}

    void clear() {
        arr.clear();
    }

    size_t length() const {
        return arr.size();
    }

    std::optional<PrevContextItem> at(ssize_t i) const {
        auto idx = resolve_arr_index(i);
        if (!idx) return std::nullopt;
        return arr[*idx];
    }

    std::optional<PrevContextItem> last() const {
        if (arr.empty()) return std::nullopt;
        return arr.back();
    }

    std::optional<std::string> last_text() const {
        auto l = last();
        if (l && l->first) return l->first;
        return std::nullopt;
    }

    std::optional<List> last_type() const {
        auto l = last();
        if (l && l->second) return l->second;
        return std::nullopt;
    }

    std::optional<List> type_at(ssize_t i) const {
        auto val = at(i);
        if (val && val->second) return val->second;
        return std::nullopt;
    }

    std::optional<std::string> text_at(ssize_t i) const {
        auto val = at(i);
        if (val && val->first) return val->first;
        return std::nullopt;
    }

    void push(PrevContextItem item) {
        if (!item.first || item.first->empty()) {
            return;
        }
        arr.push_back(std::move(item));
        if (arr.size() > max_len) {
            arr.pop_front();
        }
    }
};

class InputTextCursor {
private:
    std::string text;
    std::vector<size_t> char_offsets;
    size_t m_pos;

public:
    InputTextCursor(std::string txt) : text(std::move(txt)), m_pos(0) {
        size_t byte_idx = 0;
        char_offsets.push_back(0);
        while (byte_idx < text.size()) {
            unsigned char c = text[byte_idx];
            byte_idx++;
            while (byte_idx < text.size() && (static_cast<unsigned char>(text[byte_idx]) & 0xC0) == 0x80) {
                byte_idx++;
            }
            char_offsets.push_back(byte_idx);
        }
    }

    size_t pos() const {
        return m_pos;
    }

    size_t char_count() const {
        return char_offsets.size() - 1;
    }

    std::optional<std::string_view> peek_at(size_t index_units) const {
        if (index_units + 1 < char_offsets.size()) {
            size_t start = char_offsets[index_units];
            size_t end = char_offsets[index_units + 1];
            return std::string_view(text).substr(start, end - start);
        }
        return std::nullopt;
    }

    std::optional<std::string_view> peek() const {
        return peek_at(m_pos);
    }

    std::optional<std::string_view> peek_at_offset_units(size_t offset_units) const {
        return peek_at(m_pos + offset_units);
    }

    std::optional<std::string_view> peek_at_str(size_t index_units) const {
        return peek_at(index_units);
    }

    void advance(size_t units) {
        m_pos += units;
    }

    std::optional<std::string_view> slice(size_t start, size_t end) const {
        if (start > end || end > char_count()) {
            return std::nullopt;
        }
        size_t start_byte = char_offsets[start];
        size_t end_byte = char_offsets[end];
        return std::string_view(text).substr(start_byte, end_byte - start_byte);
    }
};

struct MatchPrevKramaSequenceResult {
    bool matched;
    size_t matched_len;
};

template <typename F>
MatchPrevKramaSequenceResult match_prev_krama_sequence(
    const ScriptData& data,
    F peek_at,
    ssize_t anchor_index,
    const std::vector<int16_t>& prev
) {
    for (size_t i = 0; i < prev.size(); ++i) {
        int16_t expected_krama_index = prev[prev.size() - 1 - i];
        auto opt_info = peek_at(anchor_index - static_cast<ssize_t>(i));
        if (!opt_info) {
            return {false, 0};
        }
        
        const auto& lookup = get_common_attr(data).krama_text_lookup;
        auto got_krama_index = lookup.find(std::string(*opt_info));
        if (got_krama_index == lookup.end() ||
            got_krama_index->second != static_cast<size_t>(expected_krama_index)) {
            return {false, 0};
        }
    }

    return {true, prev.size()};
}

const std::vector<std::string> TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS = {"²", "³", "⁴"};
inline bool is_ta_ext_superscript_tail(const std::optional<std::string_view>& ch) {
    if (!ch) return false;
    for (const auto& s : TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS) {
        if (*ch == s) return true;
    }
    return false;
}

const std::vector<std::string> VEDIC_SVARAS = {"॒", "॑", "᳚", "᳛"};
inline bool is_vedic_svara_tail(const std::optional<std::string_view>& ch) {
    if (!ch) return false;
    for (const auto& s : VEDIC_SVARAS) {
        if (*ch == s) return true;
    }
    return false;
}

inline bool is_script_tamil_ext(ScriptListEnum var) {
    return var == ScriptListEnum::TamilExtended;
}

const std::vector<std::string> VEDIC_SVARAS_TYPING_SYMBOLS = {"_", "'''", "''", "'"};
const std::vector<std::string> VEDIC_SVARAS_NORMAL_SYMBOLS = {"↓", "↑↑↑", "↑↑", "↑"};

inline std::string apply_typing_input_aliases(const std::string& text, ScriptListEnum to_script_name) {
    if (text.empty()) {
        return text;
    }

    bool needs_x = (text.find('x') != std::string::npos);
    bool is_ta_ext = (to_script_name == ScriptListEnum::TamilExtended);

    bool needs_vedic = false;
    if (is_ta_ext) {
        for (const auto& symbol : VEDIC_SVARAS_TYPING_SYMBOLS) {
            if (text.find(symbol) != std::string::npos) {
                needs_vedic = true;
                break;
            }
        }
    }

    if (!needs_x && !needs_vedic) {
        return text;
    }

    std::string result = text;
    if (needs_x) {
        size_t pos = 0;
        while ((pos = result.find('x', pos)) != std::string::npos) {
            result.replace(pos, 1, "kSh");
            pos += 3;
        }
    }

    if (needs_vedic) {
        for (size_t i = 0; i < VEDIC_SVARAS_TYPING_SYMBOLS.size(); ++i) {
            const auto& symbol = VEDIC_SVARAS_TYPING_SYMBOLS[i];
            const auto& normal = VEDIC_SVARAS_NORMAL_SYMBOLS[i];
            size_t pos = 0;
            while ((pos = result.find(symbol, pos)) != std::string::npos) {
                result.replace(pos, symbol.length(), normal);
                pos += normal.length();
            }
        }
    }

    return result;
}

} // namespace lipilekhika
