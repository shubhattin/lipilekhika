#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <optional>
#include <variant>
#include <utility>
#include <stdexcept>
#include <nlohmann/json.hpp>

namespace lipilekhika {

struct TextToKramaMap {
    std::optional<std::vector<std::string>> next;
    std::optional<std::vector<int16_t>> krama;
    std::optional<int16_t> fallback_list_ref;
    std::optional<int16_t> custom_back_ref; // only in typing_text_to_krama_map
};

inline void from_json(const nlohmann::json& j, TextToKramaMap& m) {
    if (j.contains("next") && !j.at("next").is_null()) {
        m.next = j.at("next").get<std::vector<std::string>>();
    } else {
        m.next = std::nullopt;
    }
    if (j.contains("krama") && !j.at("krama").is_null()) {
        m.krama = j.at("krama").get<std::vector<int16_t>>();
    } else {
        m.krama = std::nullopt;
    }
    if (j.contains("fallback_list_ref") && !j.at("fallback_list_ref").is_null()) {
        m.fallback_list_ref = j.at("fallback_list_ref").get<int16_t>();
    } else {
        m.fallback_list_ref = std::nullopt;
    }
    if (j.contains("custom_back_ref") && !j.at("custom_back_ref").is_null()) {
        m.custom_back_ref = j.at("custom_back_ref").get<int16_t>();
    } else {
        m.custom_back_ref = std::nullopt;
    }
}

struct ListAnya {
    std::vector<int16_t> krama_ref;
};

struct ListVyanjana {
    std::vector<int16_t> krama_ref;
};

struct ListMatra {
    std::vector<int16_t> krama_ref;
};

struct ListSvara {
    std::vector<int16_t> krama_ref;
    std::vector<int16_t> matra_krama_ref;
};

using List = std::variant<ListAnya, ListVyanjana, ListMatra, ListSvara>;

inline void from_json(const nlohmann::json& j, List& l) {
    std::string type = j.at("type").get<std::string>();
    if (type == "anya") {
        ListAnya anya;
        anya.krama_ref = j.at("krama_ref").get<std::vector<int16_t>>();
        l = anya;
    } else if (type == "vyanjana") {
        ListVyanjana vyanjana;
        vyanjana.krama_ref = j.at("krama_ref").get<std::vector<int16_t>>();
        l = vyanjana;
    } else if (type == "mAtrA") {
        ListMatra matra;
        matra.krama_ref = j.at("krama_ref").get<std::vector<int16_t>>();
        l = matra;
    } else if (type == "svara") {
        ListSvara svara;
        svara.krama_ref = j.at("krama_ref").get<std::vector<int16_t>>();
        svara.matra_krama_ref = j.at("mAtrA_krama_ref").get<std::vector<int16_t>>();
        l = svara;
    } else {
        throw std::runtime_error("Unknown List type: " + type);
    }
}

struct KramaTextItem {
    std::string text;
    std::optional<int16_t> value;
};

inline void from_json(const nlohmann::json& j, KramaTextItem& item) {
    item.text = j.at(0).get<std::string>();
    if (j.at(1).is_null()) {
        item.value = std::nullopt;
    } else {
        item.value = j.at(1).get<int16_t>();
    }
}

struct TextToKramaMapItem {
    std::string text;
    TextToKramaMap map;
};

inline void from_json(const nlohmann::json& j, TextToKramaMapItem& item) {
    item.text = j.at(0).get<std::string>();
    item.map = j.at(1).get<TextToKramaMap>();
}

struct CustomScriptCharItem {
    std::string text;
    std::optional<int16_t> val1;
    std::optional<int16_t> val2;
};

inline void from_json(const nlohmann::json& j, CustomScriptCharItem& item) {
    item.text = j.at(0).get<std::string>();
    if (j.at(1).is_null()) {
        item.val1 = std::nullopt;
    } else {
        item.val1 = j.at(1).get<int16_t>();
    }
    if (j.at(2).is_null()) {
        item.val2 = std::nullopt;
    } else {
        item.val2 = j.at(2).get<int16_t>();
    }
}

struct CommonScriptAttr {
    std::string script_name;
    uint8_t script_id;
    std::vector<KramaTextItem> krama_text_arr;
    std::vector<size_t> krama_text_arr_index;
    std::vector<TextToKramaMapItem> text_to_krama_map;
    std::vector<TextToKramaMapItem> typing_text_to_krama_map;
    std::vector<CustomScriptCharItem> custom_script_chars_arr;
    std::vector<List> list;

    // Lookup tables built on initialization
    std::unordered_map<std::string, size_t> krama_text_lookup;
    std::unordered_map<std::string, size_t> text_to_krama_lookup;
    std::unordered_map<std::string, size_t> typing_text_to_krama_lookup;
    std::unordered_map<std::string, size_t> custom_script_chars_lookup;
};

inline void from_json(const nlohmann::json& j, CommonScriptAttr& attr) {
    attr.script_name = j.at("script_name").get<std::string>();
    attr.script_id = j.at("script_id").get<uint8_t>();
    attr.krama_text_arr = j.at("krama_text_arr").get<std::vector<KramaTextItem>>();
    attr.krama_text_arr_index = j.at("krama_text_arr_index").get<std::vector<size_t>>();
    attr.text_to_krama_map = j.at("text_to_krama_map").get<std::vector<TextToKramaMapItem>>();
    attr.typing_text_to_krama_map = j.at("typing_text_to_krama_map").get<std::vector<TextToKramaMapItem>>();
    attr.custom_script_chars_arr = j.at("custom_script_chars_arr").get<std::vector<CustomScriptCharItem>>();
    attr.list = j.at("list").get<std::vector<List>>();
}

struct BrahmicScriptData {
    CommonScriptAttr common_script_attr;
    bool schwa_property;
    std::string halant;
    std::optional<std::string> nuqta;
};

struct OtherScriptData {
    CommonScriptAttr common_script_attr;
    std::string schwa_character;
};

using ScriptData = std::variant<BrahmicScriptData, OtherScriptData>;

inline void from_json(const nlohmann::json& j, ScriptData& data) {
    std::string script_type = j.at("script_type").get<std::string>();
    if (script_type == "brahmic") {
        BrahmicScriptData brahmic;
        brahmic.common_script_attr = j.get<CommonScriptAttr>();
        brahmic.schwa_property = j.at("schwa_property").get<bool>();
        brahmic.halant = j.at("halant").get<std::string>();
        if (j.contains("nuqta") && !j.at("nuqta").is_null()) {
            brahmic.nuqta = j.at("nuqta").get<std::string>();
        } else {
            brahmic.nuqta = std::nullopt;
        }
        data = brahmic;
    } else if (script_type == "other") {
        OtherScriptData other;
        other.common_script_attr = j.get<CommonScriptAttr>();
        other.schwa_character = j.at("schwa_character").get<std::string>();
        data = other;
    } else {
        throw std::runtime_error("Unknown script_type: " + script_type);
    }
}

enum class CustomOptionScriptTypeEnum {
    Brahmic,
    Other,
    All
};

inline void from_json(const nlohmann::json& j, CustomOptionScriptTypeEnum& val) {
    std::string s = j.get<std::string>();
    if (s == "brahmic") val = CustomOptionScriptTypeEnum::Brahmic;
    else if (s == "other") val = CustomOptionScriptTypeEnum::Other;
    else if (s == "all") val = CustomOptionScriptTypeEnum::All;
    else throw std::runtime_error("Unknown CustomOptionScriptTypeEnum: " + s);
}

enum class CheckInEnum {
    Input,
    Output
};

inline void from_json(const nlohmann::json& j, CheckInEnum& val) {
    std::string s = j.get<std::string>();
    if (s == "input") val = CheckInEnum::Input;
    else if (s == "output") val = CheckInEnum::Output;
    else throw std::runtime_error("Unknown CheckInEnum: " + s);
}

struct RuleReplacePrevKramaKeys {
    std::optional<bool> use_replace;
    std::vector<int16_t> prev;
    std::vector<int16_t> following;
    std::vector<int16_t> replace_with;
    std::optional<CheckInEnum> check_in;
};

struct RuleDirectReplace {
    std::optional<bool> use_replace;
    std::vector<std::vector<int16_t>> to_replace;
    std::vector<int16_t> replace_with;
    std::optional<std::string> replace_text;
    std::optional<CheckInEnum> check_in;
};

using Rule = std::variant<RuleReplacePrevKramaKeys, RuleDirectReplace>;

inline void from_json(const nlohmann::json& j, Rule& rule) {
    std::string type = j.at("type").get<std::string>();
    if (type == "replace_prev_krama_keys") {
        RuleReplacePrevKramaKeys r;
        if (j.contains("use_replace") && !j.at("use_replace").is_null()) {
            r.use_replace = j.at("use_replace").get<bool>();
        } else {
            r.use_replace = std::nullopt;
        }
        r.prev = j.at("prev").get<std::vector<int16_t>>();
        r.following = j.at("following").get<std::vector<int16_t>>();
        r.replace_with = j.at("replace_with").get<std::vector<int16_t>>();
        if (j.contains("check_in") && !j.at("check_in").is_null()) {
            r.check_in = j.at("check_in").get<CheckInEnum>();
        } else {
            r.check_in = std::nullopt;
        }
        rule = r;
    } else if (type == "direct_replace") {
        RuleDirectReplace r;
        if (j.contains("use_replace") && !j.at("use_replace").is_null()) {
            r.use_replace = j.at("use_replace").get<bool>();
        } else {
            r.use_replace = std::nullopt;
        }
        r.to_replace = j.at("to_replace").get<std::vector<std::vector<int16_t>>>();
        r.replace_with = j.at("replace_with").get<std::vector<int16_t>>();
        if (j.contains("replace_text") && !j.at("replace_text").is_null()) {
            r.replace_text = j.at("replace_text").get<std::string>();
        } else {
            r.replace_text = std::nullopt;
        }
        if (j.contains("check_in") && !j.at("check_in").is_null()) {
            r.check_in = j.at("check_in").get<CheckInEnum>();
        } else {
            r.check_in = std::nullopt;
        }
        rule = r;
    } else {
        throw std::runtime_error("Unknown Rule type: " + type);
    }
}

struct CustomOptions {
    std::optional<std::vector<std::string>> from_script_name;
    std::optional<CustomOptionScriptTypeEnum> from_script_type;
    std::optional<std::vector<std::string>> to_script_name;
    std::optional<CustomOptionScriptTypeEnum> to_script_type;
    CheckInEnum check_in;
    std::vector<Rule> rules;
};

inline void from_json(const nlohmann::json& j, CustomOptions& opts) {
    if (j.contains("from_script_name") && !j.at("from_script_name").is_null()) {
        opts.from_script_name = j.at("from_script_name").get<std::vector<std::string>>();
    } else {
        opts.from_script_name = std::nullopt;
    }
    if (j.contains("from_script_type") && !j.at("from_script_type").is_null()) {
        opts.from_script_type = j.at("from_script_type").get<CustomOptionScriptTypeEnum>();
    } else {
        opts.from_script_type = std::nullopt;
    }
    if (j.contains("to_script_name") && !j.at("to_script_name").is_null()) {
        opts.to_script_name = j.at("to_script_name").get<std::vector<std::string>>();
    } else {
        opts.to_script_name = std::nullopt;
    }
    if (j.contains("to_script_type") && !j.at("to_script_type").is_null()) {
        opts.to_script_type = j.at("to_script_type").get<CustomOptionScriptTypeEnum>();
    } else {
        opts.to_script_type = std::nullopt;
    }
    opts.check_in = j.at("check_in").get<CheckInEnum>();
    opts.rules = j.at("rules").get<std::vector<Rule>>();
}

using CustomOptionMap = std::vector<std::pair<std::string, CustomOptions>>;

inline void from_json(const nlohmann::json& j, CustomOptionMap& map) {
    if (!j.is_object()) {
        throw std::runtime_error("CustomOptionMap must be a JSON object");
    }
    for (auto it = j.begin(); it != j.end(); ++it) {
        map.push_back({it.key(), it.value().get<CustomOptions>()});
    }
}

struct ScriptListData {
    std::vector<std::string> scripts;
    std::vector<std::string> langs;
    std::unordered_map<std::string, std::string> lang_script_map;
    std::unordered_map<std::string, std::string> script_alternates_map;
};

inline void from_json(const nlohmann::json& j, ScriptListData& data) {
    if (j.contains("scripts") && !j.at("scripts").is_null()) {
        const auto& obj = j.at("scripts");
        for (auto it = obj.begin(); it != obj.end(); ++it) {
            data.scripts.push_back(it.key());
        }
    }
    if (j.contains("langs") && !j.at("langs").is_null()) {
        const auto& obj = j.at("langs");
        for (auto it = obj.begin(); it != obj.end(); ++it) {
            data.langs.push_back(it.key());
        }
    }
    data.lang_script_map = j.at("lang_script_map").get<std::unordered_map<std::string, std::string>>();
    data.script_alternates_map = j.at("script_alternates_map").get<std::unordered_map<std::string, std::string>>();
}

} // namespace lipilekhika
