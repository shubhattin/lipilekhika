#pragma once

#include "schema.hpp"
#include <mutex>
#include <fstream>

namespace lipilekhika {

inline const std::vector<int16_t>& get_krama_ref(const List& l) {
    return std::visit([](const auto& arg) -> const std::vector<int16_t>& {
        return arg.krama_ref;
    }, l);
}

inline bool is_svara(const List& l) {
    return std::holds_alternative<ListSvara>(l);
}

inline bool is_matra(const List& l) {
    return std::holds_alternative<ListMatra>(l);
}

inline bool is_vyanjana(const List& l) {
    return std::holds_alternative<ListVyanjana>(l);
}

inline bool is_anya(const List& l) {
    return std::holds_alternative<ListAnya>(l);
}

const ScriptListData& get_script_list_data();

} // namespace lipilekhika
