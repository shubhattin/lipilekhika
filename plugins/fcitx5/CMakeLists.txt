cmake_minimum_required(VERSION 3.21)
project(fcitx5-lipilekhika LANGUAGES CXX)

find_package(Fcitx5Core REQUIRED)
find_package(Fcitx5Config REQUIRED)

# Setup common compiler options compatible with Fcitx5 (C++17).
include("${FCITX_INSTALL_CMAKECONFIG_DIR}/Fcitx5Utils/Fcitx5CompilerSettings.cmake")

add_subdirectory(addon)

