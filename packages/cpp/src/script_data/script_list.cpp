#include "script_list.hpp"
#include <mutex>
#include <fstream>
#include <stdexcept>
#include <iostream>

#ifndef LIPILEKHIKA_DATA_DIR
#define LIPILEKHIKA_DATA_DIR "../rust/src/data"
#endif

namespace lipilekhika {

const ScriptListData& get_script_list_data() {
    static ScriptListData data;
    static std::once_flag flag;
    std::call_once(flag, []() {
        std::string path = std::string(LIPILEKHIKA_DATA_DIR) + "/script_list.json";
        std::ifstream f(path);
        if (!f.is_open()) {
            throw std::runtime_error("Could not open script_list.json at: " + path);
        }
        nlohmann::json j;
        f >> j;
        data = j.get<ScriptListData>();
    });
    return data;
}

} // namespace lipilekhika
