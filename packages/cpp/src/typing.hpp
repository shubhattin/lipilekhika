#pragma once

#include <string>
#include <string_view>
#include <optional>
#include <chrono>
#include <vector>
#include "scripts.hpp"
#include "script_data/script_data.hpp"
#include "transliterate/transliterate.hpp"

namespace lipilekhika {

constexpr uint64_t DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS = 4500;
constexpr bool DEFAULT_USE_NATIVE_NUMERALS = true;
constexpr bool DEFAULT_INCLUDE_INHERENT_VOWEL = false;

struct TypingContextOptions {
    uint64_t auto_context_clear_time_ms = DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS;
    bool use_native_numerals = DEFAULT_USE_NATIVE_NUMERALS;
    bool include_inherent_vowel = DEFAULT_INCLUDE_INHERENT_VOWEL;
};

struct TypingDiff {
    size_t to_delete_chars_count;
    std::string diff_add_text;
    size_t context_length;
};

class TypingContext {
private:
    ScriptListEnum typing_script;
    bool use_native_numerals;
    bool include_inherent_vowel;
    std::string curr_input;
    std::string curr_output;
    std::chrono::milliseconds auto_context_clear_time;
    std::optional<std::chrono::steady_clock::time_point> last_time;

    const ScriptData* from_script_data;
    const ScriptData* to_script_data;
    std::vector<const Rule*> custom_rules;

    TransliterationFnOptions build_translit_options() const;

public:
    TypingContext(Script typing_script, std::optional<TypingContextOptions> options = std::nullopt);

    void clear_context();
    TypingDiff take_key_input(std::string_view key);

    // Helpers to get options/status
    bool get_use_native_numerals() const { return use_native_numerals; }
    bool get_include_inherent_vowel() const { return include_inherent_vowel; }
    void update_use_native_numerals(bool val) { use_native_numerals = val; }
    void update_include_inherent_vowel(bool val) { include_inherent_vowel = val; }
    std::string_view get_normalized_script() const { return get_common_attr(*to_script_data).script_name; }
};

std::string emulate_typing(
    std::string_view text,
    Script typing_lang,
    std::optional<TypingContextOptions> options = std::nullopt
);

} // namespace lipilekhika
