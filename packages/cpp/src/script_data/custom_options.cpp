#include "custom_options.hpp"
#include <mutex>
#include <fstream>
#include <stdexcept>

#ifndef LIPILEKHIKA_DATA_DIR
#define LIPILEKHIKA_DATA_DIR "../rust/src/data"
#endif

namespace lipilekhika {

const CustomOptionMap& get_custom_options_map() {
    static CustomOptionMap map;
    static std::once_flag flag;
    std::call_once(flag, []() {
        std::string path = std::string(LIPILEKHIKA_DATA_DIR) + "/custom_options.json";
        std::ifstream f(path);
        if (!f.is_open()) {
            throw std::runtime_error("Could not open custom_options.json at: " + path);
        }
        nlohmann::json j;
        f >> j;
        map = j.get<CustomOptionMap>();
    });
    return map;
}

} // namespace lipilekhika
