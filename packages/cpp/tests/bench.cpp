#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <filesystem>
#include <chrono>
#include <unordered_map>
#include <algorithm>
#include <yaml-cpp/yaml.h>
#include "lipilekhika.hpp"

namespace fs = std::filesystem;

const std::string BULK_SEPARATOR = "\n";
const int ITERATIONS = 3;

struct TransliterationTestCase {
    std::string index;
    std::string from;
    std::string to;
    std::string input;
    std::string output;
    std::unordered_map<std::string, bool> options;
    lipilekhika::Script from_script;
    lipilekhika::Script to_script;
    bool todo = false;
};

struct TransliterationBatch {
    std::string from;
    std::string to;
    std::string input;
    lipilekhika::Script from_script;
    lipilekhika::Script to_script;
};

struct TypingOptionsYaml {
    std::optional<bool> use_native_numerals;
    std::optional<bool> include_inherent_vowel;
    std::optional<uint64_t> auto_context_clear_time_ms;
};

struct TypingTestCase {
    int64_t index = 0;
    std::string text;
    std::string output;
    std::string script;
    bool todo = false;
    TypingOptionsYaml options;
    lipilekhika::Script script_enum;
};

bool path_contains_context(const fs::path& p) {
    for (const auto& part : p) {
        if (part == "context") {
            return true;
        }
    }
    return false;
}

void list_yaml_files_recursive(const fs::path& dir, std::vector<fs::path>& out) {
    if (!fs::exists(dir)) return;
    for (const auto& entry : fs::recursive_directory_iterator(dir)) {
        if (entry.is_regular_file() && entry.path().extension() == ".yaml") {
            out.push_back(entry.path());
        }
    }
}

void list_yaml_files_typing(const fs::path& dir, std::vector<fs::path>& out) {
    if (!fs::exists(dir)) return;
    for (const auto& entry : fs::recursive_directory_iterator(dir)) {
        if (entry.is_regular_file() && entry.path().extension() == ".yaml") {
            if (!path_contains_context(entry.path())) {
                out.push_back(entry.path());
            }
        }
    }
}

std::vector<TransliterationTestCase> get_test_data(const fs::path& root) {
    std::vector<fs::path> files;
    list_yaml_files_recursive(root, files);
    std::sort(files.begin(), files.end());

    std::vector<TransliterationTestCase> data;
    for (const auto& file : files) {
        YAML::Node doc;
        try {
            doc = YAML::LoadFile(file.string());
        } catch (const std::exception& e) {
            std::cerr << "Failed parsing `" << file.string() << "`: " << e.what() << std::endl;
            continue;
        }

        for (const auto& node : doc) {
            TransliterationTestCase tc;
            try {
                if (node["index"]) {
                    tc.index = node["index"].as<std::string>();
                }
                tc.from = node["from"].as<std::string>();
                tc.to = node["to"].as<std::string>();
                tc.input = node["input"].as<std::string>();
                tc.output = node["output"].as<std::string>();
                if (node["options"]) {
                    tc.options = node["options"].as<std::unordered_map<std::string, bool>>();
                }
                if (node["todo"]) {
                    tc.todo = node["todo"].as<bool>();
                }
                
                auto from_opt = lipilekhika::script_from_string(tc.from);
                auto to_opt = lipilekhika::script_from_string(tc.to);
                if (from_opt && to_opt) {
                    tc.from_script = *from_opt;
                    tc.to_script = *to_opt;
                    data.push_back(tc);
                }
            } catch (...) {
                // ignore invalid test cases
            }
        }
    }
    return data;
}

std::vector<TypingTestCase> get_typing_test_data(const fs::path& root) {
    std::vector<fs::path> files;
    list_yaml_files_typing(root, files);
    std::sort(files.begin(), files.end());

    std::vector<TypingTestCase> data;
    for (const auto& file : files) {
        YAML::Node doc;
        try {
            doc = YAML::LoadFile(file.string());
        } catch (const std::exception& e) {
            std::cerr << "Failed parsing `" << file.string() << "`: " << e.what() << std::endl;
            continue;
        }

        for (const auto& node : doc) {
            TypingTestCase tc;
            try {
                if (node["index"]) {
                    tc.index = node["index"].as<int64_t>();
                }
                tc.text = node["text"].as<std::string>();
                tc.output = node["output"].as<std::string>();
                tc.script = node["script"].as<std::string>();
                if (node["todo"]) {
                    tc.todo = node["todo"].as<bool>();
                }

                if (node["options"]) {
                    auto opts_node = node["options"];
                    TypingOptionsYaml opts;
                    if (opts_node["useNativeNumerals"]) {
                        opts.use_native_numerals = opts_node["useNativeNumerals"].as<bool>();
                    }
                    if (opts_node["includeInherentVowel"]) {
                        opts.include_inherent_vowel = opts_node["includeInherentVowel"].as<bool>();
                    }
                    if (opts_node["autoContextTClearTimeMs"]) {
                        opts.auto_context_clear_time_ms = opts_node["autoContextTClearTimeMs"].as<uint64_t>();
                    }
                    tc.options = opts;
                }

                auto script_opt = lipilekhika::script_from_string(tc.script);
                if (script_opt) {
                    tc.script_enum = *script_opt;
                    data.push_back(tc);
                }
            } catch (...) {
                // ignore invalid test cases
            }
        }
    }
    return data;
}

std::vector<TransliterationBatch> build_transliteration_batches(const std::vector<TransliterationTestCase>& test_data) {
    std::vector<std::string> keys;
    std::unordered_map<std::string, std::vector<size_t>> grouped;

    for (size_t i = 0; i < test_data.size(); ++i) {
        const auto& item = test_data[i];
        if (item.todo) continue;
        std::string key = item.from + "-" + item.to;
        if (grouped.find(key) == grouped.end()) {
            keys.push_back(key);
        }
        grouped[key].push_back(i);
    }

    std::vector<TransliterationBatch> batches;
    for (const auto& key : keys) {
        const auto& indices = grouped[key];
        TransliterationBatch batch;
        batch.from = test_data[indices[0]].from;
        batch.to = test_data[indices[0]].to;
        batch.from_script = test_data[indices[0]].from_script;
        batch.to_script = test_data[indices[0]].to_script;

        std::string bulk_input;
        for (size_t idx : indices) {
            if (!bulk_input.empty()) {
                bulk_input += BULK_SEPARATOR;
            }
            bulk_input += test_data[idx].input;
        }
        batch.input = bulk_input;
        batches.push_back(batch);
    }
    return batches;
}

void preload_data() {
    std::vector<lipilekhika::Script> scripts = {
        lipilekhika::Script::Assamese,
        lipilekhika::Script::Bengali,
        lipilekhika::Script::Brahmi,
        lipilekhika::Script::Devanagari,
        lipilekhika::Script::Granth,
        lipilekhika::Script::Gujarati,
        lipilekhika::Script::Gurumukhi,
        lipilekhika::Script::Kannada,
        lipilekhika::Script::Malayalam,
        lipilekhika::Script::Modi,
        lipilekhika::Script::Normal,
        lipilekhika::Script::Odia,
        lipilekhika::Script::Sharada,
        lipilekhika::Script::Siddham,
        lipilekhika::Script::Sinhala,
        lipilekhika::Script::TamilExtended,
        lipilekhika::Script::Tamil,
        lipilekhika::Script::Telugu
    };
    for (auto script : scripts) {
        lipilekhika::preload_script_data(script);
    }
}

std::optional<lipilekhika::TypingContextOptions> build_typing_options(const TypingOptionsYaml& opts) {
    lipilekhika::TypingContextOptions res;
    bool has_any = false;
    if (opts.use_native_numerals.has_value()) {
        res.use_native_numerals = *opts.use_native_numerals;
        has_any = true;
    }
    if (opts.include_inherent_vowel.has_value()) {
        res.include_inherent_vowel = *opts.include_inherent_vowel;
        has_any = true;
    }
    if (opts.auto_context_clear_time_ms.has_value()) {
        res.auto_context_clear_time_ms = *opts.auto_context_clear_time_ms;
        has_any = true;
    }
    if (has_any) return res;
    return std::nullopt;
}

double measure_individual_transliteration(const std::vector<TransliterationTestCase>& test_data) {
    auto start = std::chrono::steady_clock::now();
    for (const auto& td : test_data) {
        if (td.todo) continue;
        auto res = lipilekhika::transliterate(td.input, td.from_script, td.to_script, td.options);
        (void)res;
    }
    auto end = std::chrono::steady_clock::now();
    std::chrono::duration<double, std::milli> duration = end - start;
    return duration.count();
}

double measure_bulk_transliteration(const std::vector<TransliterationBatch>& batches) {
    auto start = std::chrono::steady_clock::now();
    for (const auto& batch : batches) {
        auto res = lipilekhika::transliterate(batch.input, batch.from_script, batch.to_script, {});
        (void)res;
    }
    auto end = std::chrono::steady_clock::now();
    std::chrono::duration<double, std::milli> duration = end - start;
    return duration.count();
}

double measure_typing_normal_to_others(const std::vector<TransliterationTestCase>& test_data) {
    auto start = std::chrono::steady_clock::now();
    for (const auto& td : test_data) {
        if (td.todo || td.from != "Normal") {
            continue;
        }
        auto res = lipilekhika::emulate_typing(td.input, td.to_script, std::nullopt);
        (void)res;
    }
    auto end = std::chrono::steady_clock::now();
    std::chrono::duration<double, std::milli> duration = end - start;
    return duration.count();
}

double measure_typing_others_to_normal(const std::vector<TypingTestCase>& typing_data) {
    auto start = std::chrono::steady_clock::now();
    for (const auto& td : typing_data) {
        if (td.todo) {
            continue;
        }
        auto opts = build_typing_options(td.options);
        auto res = lipilekhika::emulate_typing(td.text, td.script_enum, opts);
        (void)res;
    }
    auto end = std::chrono::steady_clock::now();
    std::chrono::duration<double, std::milli> duration = end - start;
    return duration.count();
}

std::string format_ms(double ms) {
    char buf[64];
    snprintf(buf, sizeof(buf), "%.2f ms", ms);
    return std::string(buf);
}

int main() {
    fs::path current_path = fs::current_path();
    fs::path root = current_path / "../../test_data/transliteration";
    if (!fs::exists(root)) {
        root = fs::canonical(fs::path(__FILE__).parent_path() / "../../../test_data/transliteration");
    }

    fs::path typing_root = current_path / "../../test_data/typing";
    if (!fs::exists(typing_root)) {
        typing_root = fs::canonical(fs::path(__FILE__).parent_path() / "../../../test_data/typing");
    }

    std::vector<TransliterationTestCase> test_data = get_test_data(root);
    std::vector<TransliterationBatch> transliteration_batches = build_transliteration_batches(test_data);
    std::vector<TypingTestCase> typing_data = get_typing_test_data(typing_root);

    std::cout << "Loaded test_data: " << test_data.size() << std::endl;
    std::cout << "Loaded transliteration_batches: " << transliteration_batches.size() << std::endl;
    std::cout << "Loaded typing_data: " << typing_data.size() << std::endl;

    std::cout << "Benchmark Results" << std::endl;
    std::cout << "Precomputed " << transliteration_batches.size()
              << " bulk batches from " << test_data.size()
              << " transliteration cases by from-to, ignoring custom options." << std::endl;

    std::cout << "Preloading data..." << std::endl;
    preload_data();
    std::cout << "Preloading done." << std::endl;

    double translit_iterated_sum = 0;
    double translit_bulk_sum = 0;
    double typing_normal_sum = 0;
    double typing_others_sum = 0;

    std::cout << "Running benchmarks..." << std::endl;
    for (int i = 0; i < ITERATIONS; ++i) {
        std::cout << "Iteration " << i + 1 << "..." << std::endl;
        std::cout << "  translit_iterated..." << std::endl;
        translit_iterated_sum += measure_individual_transliteration(test_data);
        std::cout << "  translit_bulk..." << std::endl;
        translit_bulk_sum += measure_bulk_transliteration(transliteration_batches);
        std::cout << "  typing_normal..." << std::endl;
        typing_normal_sum += measure_typing_normal_to_others(test_data);
        std::cout << "  typing_others..." << std::endl;
        typing_others_sum += measure_typing_others_to_normal(typing_data);
    }
    std::cout << "Done running benchmarks." << std::endl;

    double translit_iterated_avg = translit_iterated_sum / ITERATIONS;
    double translit_bulk_avg = translit_bulk_sum / ITERATIONS;
    double typing_normal_avg = typing_normal_sum / ITERATIONS;
    double typing_others_avg = typing_others_sum / ITERATIONS;

    size_t translit_total = 0;
    size_t normal_to_others_total = 0;
    for (const auto& td : test_data) {
        if (!td.todo) {
            translit_total++;
            if (td.from == "Normal") {
                normal_to_others_total++;
            }
        }
    }
    size_t others_to_normal_total = 0;
    for (const auto& td : typing_data) {
        if (!td.todo) {
            others_to_normal_total++;
        }
    }

    std::cout << "\n";
    printf("%-40s %15s %15s\n", "Benchmark", "Iterated (Avg)", "Bulk (Avg)");
    printf("%-40s %15s %15s\n", "----------------------------------------", "---------------", "---------------");
    printf("%-40s %15s %15s\n", "Transliteration Cases", format_ms(translit_iterated_avg).c_str(), format_ms(translit_bulk_avg).c_str());
    printf("%-40s %15s %15s\n", "Typing Emulation (Normal -> others)", format_ms(typing_normal_avg).c_str(), "N/A");
    printf("%-40s %15s %15s\n", "Typing Emulation (others -> Normal)", format_ms(typing_others_avg).c_str(), "N/A");

    fs::create_directories("test_log");
    std::ofstream log_file("test_log/benchmark.txt");
    if (log_file.is_open()) {
        log_file << "Lipilekhika C++ benchmark (averaged over " << ITERATIONS << " iterations)\n";
        log_file << "Transliteration Cases: cases=" << translit_total << ", avg_time_ms=" << translit_iterated_avg << "\n";
        log_file << "Typing Emulation (Normal -> others): cases=" << normal_to_others_total << ", avg_time_ms=" << typing_normal_avg << "\n";
        log_file << "Typing Emulation (others -> Normal): cases=" << others_to_normal_total << ", avg_time_ms=" << typing_others_avg << "\n";
        log_file << "Total Average: time_ms=" << (translit_iterated_avg + typing_normal_avg + typing_others_avg) << "\n";
    }

    return 0;
}
