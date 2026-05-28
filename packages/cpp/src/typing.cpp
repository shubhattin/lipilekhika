#include "typing.hpp"
#include "utils/strings.hpp"
#include <algorithm>

namespace lipilekhika {

static std::pair<size_t, std::string> compute_diff(std::string_view prev_output, std::string_view output) {
    size_t min_len = std::min(prev_output.length(), output.length());
    size_t common_bytes = 0;
    while (common_bytes < min_len && prev_output[common_bytes] == output[common_bytes]) {
        common_bytes++;
    }
    // Adjust common_bytes to point to the start of a UTF-8 character boundary.
    while (common_bytes > 0 && (static_cast<unsigned char>(prev_output[common_bytes]) & 0xC0) == 0x80) {
        common_bytes--;
    }

    std::string_view prev_tail = prev_output.substr(common_bytes);
    size_t to_delete = utf8_char_count(prev_tail);
    std::string diff_add(output.substr(common_bytes));

    return {to_delete, diff_add};
}

TypingContext::TypingContext(Script typing_lang_param, std::optional<TypingContextOptions> options) {
    auto opts = options.value_or(TypingContextOptions{});
    typing_script = to_script_list_enum(typing_lang_param);

    from_script_data = &get_script_data(ScriptListEnum::Normal);
    to_script_data = &get_script_data(typing_script);

    use_native_numerals = opts.use_native_numerals;
    include_inherent_vowel = opts.include_inherent_vowel;
    auto_context_clear_time = std::chrono::milliseconds(opts.auto_context_clear_time_ms);

    auto resolved = resolve_transliteration_rules(*from_script_data, *to_script_data, {});
    custom_rules = resolved.custom_rules;
}

void TypingContext::clear_context() {
    last_time = std::nullopt;
    curr_input.clear();
    curr_output.clear();
}

TransliterationFnOptions TypingContext::build_translit_options() const {
    TransliterationFnOptions opts;
    opts.typing_mode = true;
    opts.use_native_numerals = use_native_numerals;
    opts.include_inherent_vowel = include_inherent_vowel;
    return opts;
}

TypingDiff TypingContext::take_key_input(std::string_view key) {
    if (key.empty()) {
        return {0, "", 0};
    }
    std::string_view ch = get_first_utf8_char(key);

    auto now = std::chrono::steady_clock::now();
    if (last_time.has_value() && (now - last_time.value()) > auto_context_clear_time) {
        clear_context();
    }

    curr_input.append(ch);
    std::string prev_output = curr_output;

    auto result = transliterate_text_core(
        curr_input,
        ScriptListEnum::Normal,
        typing_script,
        *from_script_data,
        *to_script_data,
        custom_rules,
        build_translit_options()
    );

    size_t context_length = result.context_length;
    std::string output = result.output;

    auto [to_delete, diff_add] = compute_diff(prev_output, output);

    if (context_length > 0) {
        curr_output = output;
    } else {
        clear_context();
    }

    last_time = now;

    return {to_delete, diff_add, context_length};
}

std::string emulate_typing(
    std::string_view text,
    Script typing_lang,
    std::optional<TypingContextOptions> options
) {
    TypingContext ctx(typing_lang, options);
    std::string result;
    result.reserve(text.length());

    size_t byte_idx = 0;
    while (byte_idx < text.length()) {
        std::string_view sub = text.substr(byte_idx);
        std::string_view ch = get_first_utf8_char(sub);
        if (ch.empty()) {
            break;
        }
        byte_idx += ch.length();

        auto diff = ctx.take_key_input(ch);

        if (diff.to_delete_chars_count > 0) {
            size_t count = 0;
            while (count < diff.to_delete_chars_count && !result.empty()) {
                do {
                    result.pop_back();
                } while (!result.empty() && (static_cast<unsigned char>(result.back()) & 0xC0) == 0x80);
                count++;
            }
        }

        result.append(diff.diff_add_text);
    }

    return result;
}

} // namespace lipilekhika
