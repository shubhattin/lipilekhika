#pragma once

#include <string>
#include <unordered_map>
#include <optional>
#include <vector>
#include "scripts.hpp"
#include "script_data/script_data.hpp"
#include "script_data/script_list.hpp"
#include "script_data/custom_options.hpp"
#include "transliterate/transliterate.hpp"

namespace lipilekhika {

std::string transliterate(
    const std::string& text,
    Script from,
    Script to,
    const std::unordered_map<std::string, bool>& trans_options = {}
);

std::optional<bool> get_schwa_status_for_script(Script script);

const ScriptData& preload_script_data(Script script);

std::vector<std::string> get_all_options(Script from_script, Script to_script);

} // namespace lipilekhika
