#pragma once

#include "schema.hpp"
#include "../scripts.hpp"

namespace lipilekhika {

const CommonScriptAttr& get_common_attr(const ScriptData& data);
CommonScriptAttr& get_common_attr(ScriptData& data);

void init_lookups(ScriptData& data);

const ScriptData& get_script_data(ScriptListEnum script);

std::optional<size_t> krama_index_of_text(const ScriptData& data, const std::string& text);
std::optional<size_t> text_to_krama_map_index(const ScriptData& data, const std::string& text, bool use_typing_map);
std::optional<size_t> custom_script_char_index_of_text(const ScriptData& data, const std::string& text);

} // namespace lipilekhika
