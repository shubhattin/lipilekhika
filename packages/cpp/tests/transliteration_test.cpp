#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <filesystem>
#include <chrono>
#include <unordered_map>
#include <memory>
#include <stdexcept>
#include <yaml-cpp/yaml.h>
#include "lipilekhika.hpp"

namespace fs = std::filesystem;

struct TransliterationTestCase {
    std::string index;
    std::string from;
    std::string to;
    std::string input;
    std::string output;
    std::unordered_map<std::string, bool> options;
    bool reversible = false;
    bool todo = false;
};

bool contains_vedic_svara(const std::string& s) {
    const std::vector<std::string> VEDIC_SVARAS = {"\u0952", "\u0951", "\u1CDA", "\u1CDB"}; // ॒ ॑ ᳚ ᳛
    for (const auto& sv : VEDIC_SVARAS) {
        if (s.find(sv) != std::string::npos) {
            return true;
        }
    }
    return false;
}

struct FileStats {
    size_t total_cases = 0;
    size_t todo_cases = 0;
    size_t auto_vedic_skipped = 0;
    size_t forward_passed = 0;
    size_t reverse_passed = 0;
    size_t forward_asserts = 0;
    size_t reverse_asserts = 0;
    size_t failures_total = 0;
};

enum class FailureKind {
    ForwardError,
    ForwardMismatch,
    ReverseMismatch
};

struct Failure {
    std::string file;
    std::string index;
    std::string from;
    std::string to;
    FailureKind kind;
    std::string input;
    std::optional<std::string> expected;
    std::optional<std::string> actual;
    std::optional<std::string> error;
};

void list_yaml_files(const fs::path& dir, std::vector<fs::path>& out) {
    if (!fs::exists(dir)) return;
    for (const auto& entry : fs::recursive_directory_iterator(dir)) {
        if (entry.is_regular_file() && entry.path().extension() == ".yaml") {
            out.push_back(entry.path());
        }
    }
}

std::pair<FileStats, std::vector<Failure>> run_yaml_file(const fs::path& file_path, const fs::path& root) {
    std::string file_name = file_path.filename().string();
    std::string rel_s = fs::relative(file_path, root).string();

    FileStats stats;
    std::vector<Failure> failures;

    YAML::Node doc;
    try {
        doc = YAML::LoadFile(file_path.string());
    } catch (const std::exception& e) {
        std::cerr << "Failed reading/parsing YAML file `" << rel_s << "`: " << e.what() << std::endl;
        return {stats, failures};
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
            if (node["reversible"]) {
                tc.reversible = node["reversible"].as<bool>();
            }
            if (node["todo"]) {
                tc.todo = node["todo"].as<bool>();
            }
        } catch (const std::exception& e) {
            std::cerr << "Failed parsing test case in YAML `" << rel_s << "`: " << e.what() << std::endl;
            continue;
        }

        stats.total_cases++;
        if (tc.todo) {
            stats.todo_cases++;
            continue;
        }

        auto from_script_opt = lipilekhika::script_from_string(tc.from);
        if (!from_script_opt) {
            stats.forward_asserts++;
            stats.failures_total++;
            failures.push_back({
                rel_s, tc.index, tc.from, tc.to, FailureKind::ForwardError, tc.input,
                tc.output, std::nullopt, "invalid `from` script name"
            });
            continue;
        }

        auto to_script_opt = lipilekhika::script_from_string(tc.to);
        if (!to_script_opt) {
            stats.forward_asserts++;
            stats.failures_total++;
            failures.push_back({
                rel_s, tc.index, tc.from, tc.to, FailureKind::ForwardError, tc.input,
                tc.output, std::nullopt, "invalid `to` script name"
            });
            continue;
        }

        std::string result;
        try {
            result = lipilekhika::transliterate(tc.input, *from_script_opt, *to_script_opt, tc.options);
        } catch (const std::exception& e) {
            stats.forward_asserts++;
            stats.failures_total++;
            failures.push_back({
                rel_s, tc.index, tc.from, tc.to, FailureKind::ForwardError, tc.input,
                tc.output, std::nullopt, std::string(e.what())
            });
            continue;
        }

        if (file_name.rfind("auto", 0) == 0 && tc.to == "Tamil-Extended" && contains_vedic_svara(result)) {
            stats.auto_vedic_skipped++;
            continue;
        }

        stats.forward_asserts++;
        if (result == tc.output) {
            stats.forward_passed++;
        } else {
            stats.failures_total++;
            failures.push_back({
                rel_s, tc.index, tc.from, tc.to, FailureKind::ForwardMismatch, tc.input,
                tc.output, result, std::nullopt
            });
        }

        if (tc.reversible) {
            stats.reverse_asserts++;
            std::string reversed;
            try {
                reversed = lipilekhika::transliterate(result, *to_script_opt, *from_script_opt, tc.options);
            } catch (const std::exception& e) {
                stats.failures_total++;
                failures.push_back({
                    rel_s, tc.index, tc.to, tc.from, FailureKind::ReverseMismatch, result,
                    tc.input, std::nullopt, std::string("Reversed transliteration error: ") + e.what()
                });
                continue;
            }

            if (reversed == tc.input) {
                stats.reverse_passed++;
            } else {
                stats.failures_total++;
                failures.push_back({
                    rel_s, tc.index, tc.to, tc.from, FailureKind::ReverseMismatch, result,
                    tc.input, reversed, std::nullopt
                });
            }
        }
    }

    return {stats, failures};
}

int main() {
    auto started = std::chrono::steady_clock::now();

    // Locating test_data root: packages/cpp/tests/ -> ../../test_data/transliteration
    fs::path current_path = fs::current_path();
    fs::path root = current_path / "../../test_data/transliteration";
    if (!fs::exists(root)) {
        // Try fallback assuming run from packages/cpp or packages/cpp/build
        root = fs::canonical(fs::path(__FILE__).parent_path() / "../../../test_data/transliteration");
    }

    std::vector<fs::path> files;
    list_yaml_files(root, files);
    std::sort(files.begin(), files.end());

    if (files.empty()) {
        std::cerr << "No YAML test files found in `" << root << "`" << std::endl;
        return 1;
    }

    size_t file_count = files.size();
    FileStats overall;
    std::vector<Failure> overall_failures;
    std::vector<std::pair<std::string, FileStats>> failed_files;

    for (const auto& file : files) {
        std::string rel_s = fs::relative(file, root).string();
        auto [stats, failures] = run_yaml_file(file, root);

        overall.total_cases += stats.total_cases;
        overall.todo_cases += stats.todo_cases;
        overall.auto_vedic_skipped += stats.auto_vedic_skipped;
        overall.forward_passed += stats.forward_passed;
        overall.reverse_passed += stats.reverse_passed;
        overall.forward_asserts += stats.forward_asserts;
        overall.reverse_asserts += stats.reverse_asserts;
        overall.failures_total += stats.failures_total;

        if (stats.failures_total == 0) {
            std::cout << ".";
        } else {
            std::cout << "F";
            failed_files.push_back({rel_s, stats});
        }
        std::cout.flush();

        for (auto& f : failures) {
            overall_failures.push_back(std::move(f));
        }
    }
    std::cout << std::endl;

    size_t total_asserts = overall.forward_asserts + overall.reverse_asserts;
    size_t total_passed = overall.forward_passed + overall.reverse_passed;
    size_t total_skipped = overall.todo_cases + overall.auto_vedic_skipped;
    size_t failed_file_count = failed_files.size();
    size_t passed_file_count = file_count - failed_file_count;

    if (!failed_files.empty()) {
        std::cout << std::endl;
        for (const auto& [file_rel, stats] : failed_files) {
            size_t total_asserts_file = stats.forward_asserts + stats.reverse_asserts;
            size_t total_passed_file = stats.forward_passed + stats.reverse_passed;
            size_t skipped_file = stats.todo_cases + stats.auto_vedic_skipped;
            std::cout << "FAIL " << file_rel
                      << "  tests = " << total_passed_file << "/" << total_asserts_file
                      << "  failures = " << stats.failures_total
                      << "  skipped = " << skipped_file << std::endl;
        }
    }

    std::cout << std::endl;
    std::cout << "Transliteration Summary:" << std::endl;
    std::cout << "  Test Files: " << passed_file_count << " passed / " << file_count << " total" << std::endl;
    std::cout << "  Tests:      " << total_passed << " passed / " << total_asserts << " total" << std::endl;
    if (total_skipped > 0) {
        std::cout << "  Skipped:    " << total_skipped << " (todo: " << overall.todo_cases << ", auto-vedic: " << overall.auto_vedic_skipped << ")" << std::endl;
    }

    auto ended = std::chrono::steady_clock::now();
    auto diff = ended - started;
    std::cout << "  Duration:   " << std::chrono::duration<double, std::milli>(diff).count() << " ms" << std::endl;

    std::string summary = "Transliteration: files_total=" + std::to_string(file_count) +
        ", files_passed=" + std::to_string(passed_file_count) +
        ", files_failed=" + std::to_string(failed_file_count) +
        ", tests_total=" + std::to_string(total_asserts) +
        ", tests_passed=" + std::to_string(total_passed) +
        ", tests_failed=" + std::to_string(overall.failures_total) +
        ", tests_skipped=" + std::to_string(total_skipped);

    fs::create_directories("test_log");
    std::ofstream summary_file("test_log/transliteration_summary.txt");
    if (summary_file.is_open()) {
        summary_file << summary << std::endl;
    }

    if (overall.failures_total > 0) {
        std::ofstream fail_file("test_log/transliteration.txt");
        if (fail_file.is_open()) {
            fail_file << "Transliteration had " << overall.failures_total << " failing assertions.\n";
            size_t count = 0;
            for (const auto& f : overall_failures) {
                count++;
                fail_file << "\n" << count << ". File: " << f.file << "\n";
                fail_file << "   Index: " << f.index << "\n";
                if (f.kind == FailureKind::ForwardMismatch) {
                    fail_file << "   Transliteration failed:\n";
                    fail_file << "     From: " << f.from << "\n";
                    fail_file << "     To: " << f.to << "\n";
                    fail_file << "     Input: \"" << f.input << "\"\n";
                    fail_file << "     Expected: \"" << f.expected.value_or("") << "\"\n";
                    fail_file << "     Actual: \"" << f.actual.value_or("") << "\"\n";
                } else if (f.kind == FailureKind::ReverseMismatch) {
                    fail_file << "   Reversed Transliteration failed:\n";
                    fail_file << "     From: " << f.from << "\n";
                    fail_file << "     To: " << f.to << "\n";
                    fail_file << "     Input: \"" << f.input << "\"\n";
                    fail_file << "     Original Input: \"" << f.expected.value_or("") << "\"\n";
                    fail_file << "     Reversed Output: \"" << f.actual.value_or("") << "\"\n";
                } else if (f.kind == FailureKind::ForwardError) {
                    fail_file << "   Transliteration error:\n";
                    fail_file << "     From: " << f.from << "\n";
                    fail_file << "     To: " << f.to << "\n";
                    fail_file << "     Input: \"" << f.input << "\"\n";
                    fail_file << "     Error: " << f.error.value_or("") << "\n";
                }
            }
        }
        std::cerr << "Failures detected. See test_log/transliteration.txt for details." << std::endl;
        return 1;
    }

    std::cout << "All tests passed successfully!" << std::endl;
    return 0;
}
