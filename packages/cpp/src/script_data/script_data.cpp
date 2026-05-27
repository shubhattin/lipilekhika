#include "script_data.hpp"
#include <mutex>
#include <fstream>
#include <stdexcept>
#include <iostream>

#ifndef LIPILEKHIKA_DATA_DIR
#define LIPILEKHIKA_DATA_DIR "../rust/src/data"
#endif

namespace lipilekhika {

const CommonScriptAttr& get_common_attr(const ScriptData& data) {
    return std::visit([](const auto& arg) -> const CommonScriptAttr& {
        return arg.common_script_attr;
    }, data);
}

CommonScriptAttr& get_common_attr(ScriptData& data) {
    return std::visit([](auto& arg) -> CommonScriptAttr& {
        return arg.common_script_attr;
    }, data);
}

void init_lookups(ScriptData& data) {
    CommonScriptAttr& attr = get_common_attr(data);
    
    attr.krama_text_lookup.reserve(attr.krama_text_arr.size());
    for (size_t i = 0; i < attr.krama_text_arr.size(); ++i) {
        attr.krama_text_lookup.emplace(attr.krama_text_arr[i].text, i);
    }

    attr.text_to_krama_lookup.reserve(attr.text_to_krama_map.size());
    for (size_t i = 0; i < attr.text_to_krama_map.size(); ++i) {
        attr.text_to_krama_lookup.emplace(attr.text_to_krama_map[i].text, i);
    }

    attr.typing_text_to_krama_lookup.reserve(attr.typing_text_to_krama_map.size());
    for (size_t i = 0; i < attr.typing_text_to_krama_map.size(); ++i) {
        attr.typing_text_to_krama_lookup.emplace(attr.typing_text_to_krama_map[i].text, i);
    }

    attr.custom_script_chars_lookup.reserve(attr.custom_script_chars_arr.size());
    for (size_t i = 0; i < attr.custom_script_chars_arr.size(); ++i) {
        attr.custom_script_chars_lookup.emplace(attr.custom_script_chars_arr[i].text, i);
    }
}

const ScriptData& get_script_data(ScriptListEnum script) {
    static std::unordered_map<ScriptListEnum, ScriptData> cache;
    static std::mutex cache_mutex;

    std::lock_guard<std::mutex> lock(cache_mutex);
    auto it = cache.find(script);
    if (it != cache.end()) {
        return it->second;
    }

    std::string path = std::string(LIPILEKHIKA_DATA_DIR) + "/script_data/" + to_string(script) + ".json";
    std::ifstream f(path);
    if (!f.is_open()) {
        throw std::runtime_error("Could not open script json at: " + path);
    }
    nlohmann::json j;
    f >> j;
    
    ScriptData data = j.get<ScriptData>();
    init_lookups(data);
    
    auto inserted = cache.emplace(script, std::move(data));
    return inserted.first->second;
}

std::optional<size_t> krama_index_of_text(const ScriptData& data, const std::string& text) {
    const CommonScriptAttr& attr = get_common_attr(data);
    auto it = attr.krama_text_lookup.find(text);
    if (it != attr.krama_text_lookup.end()) {
        return it->second;
    }
    return std::nullopt;
}

std::optional<size_t> text_to_krama_map_index(const ScriptData& data, const std::string& text, bool use_typing_map) {
    const CommonScriptAttr& attr = get_common_attr(data);
    const auto& lookup = use_typing_map ? attr.typing_text_to_krama_lookup : attr.text_to_krama_lookup;
    auto it = lookup.find(text);
    if (it != lookup.end()) {
        return it->second;
    }
    return std::nullopt;
}

std::optional<size_t> custom_script_char_index_of_text(const ScriptData& data, const std::string& text) {
    const CommonScriptAttr& attr = get_common_attr(data);
    auto it = attr.custom_script_chars_lookup.find(text);
    if (it != attr.custom_script_chars_lookup.end()) {
        return it->second;
    }
    return std::nullopt;
}

} // namespace lipilekhika
