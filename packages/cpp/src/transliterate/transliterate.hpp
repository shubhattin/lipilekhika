#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <optional>
#include "../script_data/schema.hpp"
#include "../scripts.hpp"
#include "helpers.hpp"

namespace lipilekhika {

struct TransliterationFnOptions {
    bool typing_mode = false;
    bool use_native_numerals = true;
    bool include_inherent_vowel = false;
};

struct TransliterationOutput {
    std::string output;
    size_t context_length;
};

std::unordered_map<std::string, bool> get_active_custom_options(
    const ScriptData& from_script_data,
    const ScriptData& to_script_data,
    const std::unordered_map<std::string, bool>& input_options
);

struct ResolvedTransliterationRules {
    std::unordered_map<std::string, bool> trans_options;
    std::vector<const Rule*> custom_rules;
};

ResolvedTransliterationRules resolve_transliteration_rules(
    const ScriptData& from_script_data,
    const ScriptData& to_script_data,
    const std::unordered_map<std::string, bool>& transliteration_input_options
);

TransliterationOutput transliterate_text_core(
    const std::string& text,
    ScriptListEnum from_script,
    ScriptListEnum to_script,
    const ScriptData& from_script_data,
    const ScriptData& to_script_data,
    const std::unordered_map<std::string, bool>& trans_options,
    const std::vector<const Rule*>& custom_rules,
    std::optional<TransliterationFnOptions> options = std::nullopt
);

TransliterationOutput transliterate_text(
    const std::string& text,
    ScriptListEnum from_script,
    ScriptListEnum to_script,
    const std::unordered_map<std::string, bool>& transliteration_input_options,
    std::optional<TransliterationFnOptions> options = std::nullopt
);

} // namespace lipilekhika
