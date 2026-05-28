cmake_minimum_required(VERSION 3.20)
project(lipilekhika_cpp VERSION 1.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Force-include cstdint to fix GCC 16 compatibility with third-party libraries like yaml-cpp
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
  add_compile_options(-include cstdint)
  if(CMAKE_BUILD_TYPE STREQUAL "Release")
    add_compile_options(-O3)
  endif()
endif()

# Configure data path
set(LIPILEKHIKA_DATA_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../rust/src/data"
    CACHE PATH "Path to JSON data files")
add_compile_definitions(LIPILEKHIKA_DATA_DIR="${LIPILEKHIKA_DATA_DIR}")

# Fetch dependencies
include(FetchContent)

# nlohmann/json (header-only)
FetchContent_Declare(json
  URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
)
FetchContent_MakeAvailable(json)

# yaml-cpp (for tests)
FetchContent_Declare(yaml-cpp
  GIT_REPOSITORY https://github.com/jbeder/yaml-cpp.git
  GIT_TAG 0.8.0
)
FetchContent_MakeAvailable(yaml-cpp)

# Library target
add_library(lipilekhika
  src/scripts.cpp
  src/script_data/script_data.cpp
  src/script_data/script_list.cpp
  src/script_data/custom_options.cpp
  src/transliterate/transliterate.cpp
  src/transliterate/helpers.cpp
  src/typing.cpp
  src/lipilekhika.cpp
)
target_include_directories(lipilekhika PUBLIC src/)
target_link_libraries(lipilekhika PRIVATE nlohmann_json::nlohmann_json)

# Test executable
enable_testing()
add_executable(lipilekhika_test tests/transliteration_test.cpp)
target_link_libraries(lipilekhika_test
  PRIVATE lipilekhika nlohmann_json::nlohmann_json yaml-cpp
)
add_test(NAME transliteration_yaml_tests COMMAND lipilekhika_test)

# Benchmark executable
add_executable(lipilekhika_bench tests/bench.cpp)
target_link_libraries(lipilekhika_bench
  PRIVATE lipilekhika nlohmann_json::nlohmann_json yaml-cpp
)
