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

struct TransliterationTestCase {
    std::string index;
    std::string from;
    std::string to;
    std::string input;
    std::string output;
    std::unordered_map<std::string, bool> options;
    lipilekhika::Script from_script;
    lipilekhika::Script to_script;
};

struct TransliterationBatch {
    std::string from;
    std::string to;
    std::string input;
    lipilekhika::Script from_script;
    lipilekhika::Script to_script;
};

void list_yaml_files_recursive(const fs::path& dir, std::vector<fs::path>& out) {
    if (!fs::exists(dir)) return;
    for (const auto& entry : fs::recursive_directory_iterator(dir)) {
        if (entry.is_regular_file() && entry.path().extension() == ".yaml") {
            out.push_back(entry.path());
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

std::vector<TransliterationBatch> build_transliteration_batches(const std::vector<TransliterationTestCase>& test_data) {
    std::vector<std::string> keys;
    std::unordered_map<std::string, std::vector<size_t>> grouped;

    for (size_t i = 0; i < test_data.size(); ++i) {
        const auto& item = test_data[i];
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
    // List of scripts
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

double measure_individual_transliteration(const std::vector<TransliterationTestCase>& test_data) {
    auto start = std::chrono::steady_clock::now();
    for (const auto& td : test_data) {
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

    std::vector<TransliterationTestCase> test_data = get_test_data(root);
    std::vector<TransliterationBatch> transliteration_batches = build_transliteration_batches(test_data);

    std::cout << "Benchmark Results" << std::endl;
    std::cout << "Precomputed " << transliteration_batches.size()
              << " bulk batches from " << test_data.size()
              << " transliteration cases by from-to, ignoring custom options." << std::endl;

    std::cout << "Preloading data..." << std::endl;
    preload_data();
    std::cout << "Preloading done." << std::endl;

    double transliteration_iterated = measure_individual_transliteration(test_data);
    double transliteration_bulk = measure_bulk_transliteration(transliteration_batches);

    // Print results table
    std::cout << "\n";
    printf("%-32s %12s %12s\n", "Benchmark", "Iterated", "Bulk");
    printf("%-32s %12s %12s\n", "--------------------------------", "------------", "------------");
    printf("%-32s %12s %12s\n", "Transliteration Cases", format_ms(transliteration_iterated).c_str(), format_ms(transliteration_bulk).c_str());

    return 0;
}
