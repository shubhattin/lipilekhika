#include "lipilekhika.hpp"
#include <iostream>

namespace lipilekhika {

std::string transliterate(
    const std::string& text,
    Script from,
    Script to,
    const std::unordered_map<std::string, bool>& trans_options
) {
    ScriptListEnum from_enum = to_script_list_enum(from);
    ScriptListEnum to_enum = to_script_list_enum(to);

    if (from_enum == to_enum) {
        return text;
    }

    return transliterate_text(text, from_enum, to_enum, trans_options).output;
}

std::optional<bool> get_schwa_status_for_script(Script script) {
    ScriptListEnum normalized_script = to_script_list_enum(script);
    const auto& script_data = get_script_data(normalized_script);
    if (std::holds_alternative<BrahmicScriptData>(script_data)) {
        return std::get<BrahmicScriptData>(script_data).schwa_property;
    } else {
        return std::nullopt;
    }
}

const ScriptData& preload_script_data(Script script) {
    return get_script_data(to_script_list_enum(script));
}

std::vector<std::string> get_all_options(Script from_script, Script to_script) {
    const auto& from_data = get_script_data(to_script_list_enum(from_script));
    const auto& to_data = get_script_data(to_script_list_enum(to_script));

    const auto& custom_options_map = get_custom_options_map();
    std::unordered_map<std::string, bool> all_options_enabled;
    all_options_enabled.reserve(custom_options_map.size());
    for (const auto& pair : custom_options_map) {
        all_options_enabled[pair.first] = true;
    }

    auto active_options = get_active_custom_options(from_data, to_data, all_options_enabled);

    std::vector<std::string> ordered;
    for (const auto& pair : custom_options_map) {
        if (active_options.find(pair.first) != active_options.end()) {
            ordered.push_back(pair.first);
        }
    }

    return ordered;
}

} // namespace lipilekhika
