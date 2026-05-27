#pragma once

#include <string>
#include <optional>
#include <ostream>

namespace lipilekhika {

/// The list of all supported scripts (internal resolved type)
enum class ScriptListEnum {
    Devanagari,
    Telugu,
    Tamil,
    TamilExtended,
    Bengali,
    Kannada,
    Gujarati,
    Malayalam,
    Odia,
    Sinhala,
    Normal,
    Romanized,
    Gurumukhi,
    Assamese,
    PurnaDevanagari,
    Brahmi,
    Granth,
    Modi,
    Sharada,
    Siddham
};

/// List of all supported scripts, languages and their aliases
enum class Script {
    Devanagari,
    Telugu,
    Tamil,
    TamilExtended,
    Bengali,
    Kannada,
    Gujarati,
    Malayalam,
    Odia,
    Sinhala,
    Normal,
    Romanized,
    Gurumukhi,
    Assamese,
    PurnaDevanagari,
    Brahmi,
    Granth,
    Modi,
    Sharada,
    Siddham,
    English,
    Sanskrit,
    Hindi,
    Marathi,
    Nepali,
    Punjabi,
    Be,
    Rom,
    La,
    Dev,
    TamExt,
    Sin,
    Tam,
    Ka,
    Kan,
    Si,
    Eng,
    Gur,
    Nor,
    Gu,
    Mal,
    Oriya,
    En,
    San,
    Od,
    Hin,
    Ben,
    Te,
    Ne,
    Sinh,
    Nep,
    Pun,
    Hi,
    Lat,
    ValueAs, // represents "as"
    Norm,
    Tel,
    Guj,
    De,
    TaExt,
    Or,
    Mar,
    Sa
};

// Conversions
ScriptListEnum to_script_list_enum(Script s);
std::string to_string(ScriptListEnum s);
std::string to_string(Script s);

std::optional<Script> script_from_string(const std::string& name);
std::optional<ScriptListEnum> script_list_enum_from_string(const std::string& name);

inline std::ostream& operator<<(std::ostream& os, ScriptListEnum s) {
    os << to_string(s);
    return os;
}

inline std::ostream& operator<<(std::ostream& os, Script s) {
    os << to_string(s);
    return os;
}

} // namespace lipilekhika
