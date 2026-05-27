#include "scripts.hpp"
#include <algorithm>
#include <cctype>

namespace lipilekhika {

static std::string to_lower(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(), [](unsigned char c) {
        return std::tolower(c);
    });
    return s;
}

ScriptListEnum to_script_list_enum(Script s) {
    switch (s) {
        case Script::Devanagari:      return ScriptListEnum::Devanagari;
        case Script::Telugu:          return ScriptListEnum::Telugu;
        case Script::Tamil:           return ScriptListEnum::Tamil;
        case Script::TamilExtended:   return ScriptListEnum::TamilExtended;
        case Script::Bengali:         return ScriptListEnum::Bengali;
        case Script::Kannada:         return ScriptListEnum::Kannada;
        case Script::Gujarati:        return ScriptListEnum::Gujarati;
        case Script::Malayalam:       return ScriptListEnum::Malayalam;
        case Script::Odia:            return ScriptListEnum::Odia;
        case Script::Sinhala:         return ScriptListEnum::Sinhala;
        case Script::Normal:          return ScriptListEnum::Normal;
        case Script::Romanized:       return ScriptListEnum::Romanized;
        case Script::Gurumukhi:       return ScriptListEnum::Gurumukhi;
        case Script::Assamese:        return ScriptListEnum::Assamese;
        case Script::PurnaDevanagari: return ScriptListEnum::PurnaDevanagari;
        case Script::Brahmi:          return ScriptListEnum::Brahmi;
        case Script::Granth:          return ScriptListEnum::Granth;
        case Script::Modi:            return ScriptListEnum::Modi;
        case Script::Sharada:         return ScriptListEnum::Sharada;
        case Script::Siddham:         return ScriptListEnum::Siddham;
        case Script::English:         return ScriptListEnum::Normal;
        case Script::Sanskrit:        return ScriptListEnum::Devanagari;
        case Script::Hindi:           return ScriptListEnum::Devanagari;
        case Script::Marathi:         return ScriptListEnum::Devanagari;
        case Script::Nepali:          return ScriptListEnum::Devanagari;
        case Script::Punjabi:         return ScriptListEnum::Gurumukhi;
        case Script::Be:              return ScriptListEnum::Bengali;
        case Script::Rom:             return ScriptListEnum::Romanized;
        case Script::La:              return ScriptListEnum::Normal;
        case Script::Dev:             return ScriptListEnum::Devanagari;
        case Script::TamExt:          return ScriptListEnum::TamilExtended;
        case Script::Sin:             return ScriptListEnum::Sinhala;
        case Script::Tam:             return ScriptListEnum::Tamil;
        case Script::Ka:              return ScriptListEnum::Kannada;
        case Script::Kan:             return ScriptListEnum::Kannada;
        case Script::Si:              return ScriptListEnum::Sinhala;
        case Script::Eng:             return ScriptListEnum::Normal;
        case Script::Gur:             return ScriptListEnum::Gurumukhi;
        case Script::Nor:             return ScriptListEnum::Normal;
        case Script::Gu:              return ScriptListEnum::Gujarati;
        case Script::Mal:             return ScriptListEnum::Malayalam;
        case Script::Oriya:           return ScriptListEnum::Odia;
        case Script::En:              return ScriptListEnum::Normal;
        case Script::San:             return ScriptListEnum::Devanagari;
        case Script::Od:              return ScriptListEnum::Odia;
        case Script::Hin:             return ScriptListEnum::Devanagari;
        case Script::Ben:             return ScriptListEnum::Bengali;
        case Script::Te:              return ScriptListEnum::Telugu;
        case Script::Ne:              return ScriptListEnum::Devanagari;
        case Script::Sinh:             return ScriptListEnum::Sinhala;
        case Script::Nep:             return ScriptListEnum::Devanagari;
        case Script::Pun:             return ScriptListEnum::Gurumukhi;
        case Script::Hi:              return ScriptListEnum::Devanagari;
        case Script::Lat:             return ScriptListEnum::Normal;
        case Script::ValueAs:         return ScriptListEnum::Assamese;
        case Script::Norm:            return ScriptListEnum::Normal;
        case Script::Tel:             return ScriptListEnum::Telugu;
        case Script::Guj:             return ScriptListEnum::Gujarati;
        case Script::De:              return ScriptListEnum::Devanagari;
        case Script::TaExt:           return ScriptListEnum::TamilExtended;
        case Script::Or:              return ScriptListEnum::Odia;
        case Script::Mar:             return ScriptListEnum::Devanagari;
        case Script::Sa:              return ScriptListEnum::Devanagari;
    }
    return ScriptListEnum::Normal;
}

std::string to_string(ScriptListEnum s) {
    switch (s) {
        case ScriptListEnum::Devanagari:      return "Devanagari";
        case ScriptListEnum::Telugu:          return "Telugu";
        case ScriptListEnum::Tamil:           return "Tamil";
        case ScriptListEnum::TamilExtended:   return "Tamil-Extended";
        case ScriptListEnum::Bengali:         return "Bengali";
        case ScriptListEnum::Kannada:         return "Kannada";
        case ScriptListEnum::Gujarati:        return "Gujarati";
        case ScriptListEnum::Malayalam:       return "Malayalam";
        case ScriptListEnum::Odia:            return "Odia";
        case ScriptListEnum::Sinhala:         return "Sinhala";
        case ScriptListEnum::Normal:          return "Normal";
        case ScriptListEnum::Romanized:       return "Romanized";
        case ScriptListEnum::Gurumukhi:       return "Gurumukhi";
        case ScriptListEnum::Assamese:        return "Assamese";
        case ScriptListEnum::PurnaDevanagari: return "Purna-Devanagari";
        case ScriptListEnum::Brahmi:          return "Brahmi";
        case ScriptListEnum::Granth:          return "Granth";
        case ScriptListEnum::Modi:            return "Modi";
        case ScriptListEnum::Sharada:         return "Sharada";
        case ScriptListEnum::Siddham:         return "Siddham";
    }
    return "Normal";
}

std::string to_string(Script s) {
    switch (s) {
        case Script::Devanagari:      return "Devanagari";
        case Script::Telugu:          return "Telugu";
        case Script::Tamil:           return "Tamil";
        case Script::TamilExtended:   return "Tamil-Extended";
        case Script::Bengali:         return "Bengali";
        case Script::Kannada:         return "Kannada";
        case Script::Gujarati:        return "Gujarati";
        case Script::Malayalam:       return "Malayalam";
        case Script::Odia:            return "Odia";
        case Script::Sinhala:         return "Sinhala";
        case Script::Normal:          return "Normal";
        case Script::Romanized:       return "Romanized";
        case Script::Gurumukhi:       return "Gurumukhi";
        case Script::Assamese:        return "Assamese";
        case Script::PurnaDevanagari: return "Purna-Devanagari";
        case Script::Brahmi:          return "Brahmi";
        case Script::Granth:          return "Granth";
        case Script::Modi:            return "Modi";
        case Script::Sharada:         return "Sharada";
        case Script::Siddham:         return "Siddham";
        case Script::English:         return "English";
        case Script::Sanskrit:        return "Sanskrit";
        case Script::Hindi:           return "Hindi";
        case Script::Marathi:         return "Marathi";
        case Script::Nepali:          return "Nepali";
        case Script::Punjabi:         return "Punjabi";
        case Script::Be:              return "be";
        case Script::Rom:             return "rom";
        case Script::La:              return "la";
        case Script::Dev:             return "dev";
        case Script::TamExt:          return "tam-ext";
        case Script::Sin:             return "sin";
        case Script::Tam:             return "tam";
        case Script::Ka:              return "ka";
        case Script::Kan:             return "kan";
        case Script::Si:              return "si";
        case Script::Eng:             return "eng";
        case Script::Gur:             return "gur";
        case Script::Nor:             return "nor";
        case Script::Gu:              return "gu";
        case Script::Mal:             return "mal";
        case Script::Oriya:           return "oriya";
        case Script::En:              return "en";
        case Script::San:             return "san";
        case Script::Od:              return "od";
        case Script::Hin:             return "hin";
        case Script::Ben:             return "ben";
        case Script::Te:              return "te";
        case Script::Ne:              return "ne";
        case Script::Sinh:             return "sinh";
        case Script::Nep:             return "nep";
        case Script::Pun:             return "pun";
        case Script::Hi:              return "hi";
        case Script::Lat:             return "lat";
        case Script::ValueAs:         return "as";
        case Script::Norm:            return "norm";
        case Script::Tel:             return "tel";
        case Script::Guj:             return "guj";
        case Script::De:              return "de";
        case Script::TaExt:           return "ta-ext";
        case Script::Or:              return "or";
        case Script::Mar:             return "mar";
        case Script::Sa:              return "sa";
    }
    return "Normal";
}

std::optional<Script> script_from_string(const std::string& name) {
    std::string lower = to_lower(name);
    if (lower == "devanagari") return Script::Devanagari;
    if (lower == "telugu") return Script::Telugu;
    if (lower == "tamil") return Script::Tamil;
    if (lower == "tamil-extended" || lower == "tamilextended") return Script::TamilExtended;
    if (lower == "bengali") return Script::Bengali;
    if (lower == "kannada") return Script::Kannada;
    if (lower == "gujarati") return Script::Gujarati;
    if (lower == "malayalam") return Script::Malayalam;
    if (lower == "odia") return Script::Odia;
    if (lower == "sinhala") return Script::Sinhala;
    if (lower == "normal") return Script::Normal;
    if (lower == "romanized") return Script::Romanized;
    if (lower == "gurumukhi") return Script::Gurumukhi;
    if (lower == "assamese") return Script::Assamese;
    if (lower == "purna-devanagari" || lower == "purnadevanagari") return Script::PurnaDevanagari;
    if (lower == "brahmi") return Script::Brahmi;
    if (lower == "granth") return Script::Granth;
    if (lower == "modi") return Script::Modi;
    if (lower == "sharada") return Script::Sharada;
    if (lower == "siddham") return Script::Siddham;
    if (lower == "english") return Script::English;
    if (lower == "sanskrit") return Script::Sanskrit;
    if (lower == "hindi") return Script::Hindi;
    if (lower == "marathi") return Script::Marathi;
    if (lower == "nepali") return Script::Nepali;
    if (lower == "punjabi") return Script::Punjabi;
    if (lower == "be") return Script::Be;
    if (lower == "rom") return Script::Rom;
    if (lower == "la") return Script::La;
    if (lower == "dev") return Script::Dev;
    if (lower == "tam-ext") return Script::TamExt;
    if (lower == "sin") return Script::Sin;
    if (lower == "tam") return Script::Tam;
    if (lower == "ka") return Script::Ka;
    if (lower == "kan") return Script::Kan;
    if (lower == "si") return Script::Si;
    if (lower == "eng") return Script::Eng;
    if (lower == "gur") return Script::Gur;
    if (lower == "nor") return Script::Nor;
    if (lower == "gu") return Script::Gu;
    if (lower == "mal") return Script::Mal;
    if (lower == "oriya") return Script::Oriya;
    if (lower == "en") return Script::En;
    if (lower == "san") return Script::San;
    if (lower == "od") return Script::Od;
    if (lower == "hin") return Script::Hin;
    if (lower == "ben") return Script::Ben;
    if (lower == "te") return Script::Te;
    if (lower == "ne") return Script::Ne;
    if (lower == "sinh") return Script::Sinh;
    if (lower == "nep") return Script::Nep;
    if (lower == "pun") return Script::Pun;
    if (lower == "hi") return Script::Hi;
    if (lower == "lat") return Script::Lat;
    if (lower == "as") return Script::ValueAs;
    if (lower == "norm") return Script::Norm;
    if (lower == "tel") return Script::Tel;
    if (lower == "guj") return Script::Guj;
    if (lower == "de") return Script::De;
    if (lower == "ta-ext") return Script::TaExt;
    if (lower == "or") return Script::Or;
    if (lower == "mar") return Script::Mar;
    if (lower == "sa") return Script::Sa;

    return std::nullopt;
}

std::optional<ScriptListEnum> script_list_enum_from_string(const std::string& name) {
    std::string lower = to_lower(name);
    if (lower == "devanagari") return ScriptListEnum::Devanagari;
    if (lower == "telugu") return ScriptListEnum::Telugu;
    if (lower == "tamil") return ScriptListEnum::Tamil;
    if (lower == "tamil-extended" || lower == "tamilextended") return ScriptListEnum::TamilExtended;
    if (lower == "bengali") return ScriptListEnum::Bengali;
    if (lower == "kannada") return ScriptListEnum::Kannada;
    if (lower == "gujarati") return ScriptListEnum::Gujarati;
    if (lower == "malayalam") return ScriptListEnum::Malayalam;
    if (lower == "odia") return ScriptListEnum::Odia;
    if (lower == "sinhala") return ScriptListEnum::Sinhala;
    if (lower == "normal") return ScriptListEnum::Normal;
    if (lower == "romanized") return ScriptListEnum::Romanized;
    if (lower == "gurumukhi") return ScriptListEnum::Gurumukhi;
    if (lower == "assamese") return ScriptListEnum::Assamese;
    if (lower == "purna-devanagari" || lower == "purnadevanagari") return ScriptListEnum::PurnaDevanagari;
    if (lower == "brahmi") return ScriptListEnum::Brahmi;
    if (lower == "granth") return ScriptListEnum::Granth;
    if (lower == "modi") return ScriptListEnum::Modi;
    if (lower == "sharada") return ScriptListEnum::Sharada;
    if (lower == "siddham") return ScriptListEnum::Siddham;

    return std::nullopt;
}

} // namespace lipilekhika
