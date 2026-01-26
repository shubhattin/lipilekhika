set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ---- Build Rust typing shared library (via Cargo) ----

find_program(CARGO_EXECUTABLE cargo REQUIRED)

# This CMake project is under `plugins/fcitx5/`, the Cargo workspace root is two levels up.
get_filename_component(LIPILEKHIKA_WORKSPACE_ROOT "${CMAKE_CURRENT_LIST_DIR}/../../.." ABSOLUTE)

# Keep cargo build outputs inside the CMake build tree.
# NOTE: Make sure this is absolute, because Cargo runs in the workspace root.
get_filename_component(CARGO_TARGET_DIR "${CMAKE_BINARY_DIR}/cargo-target" ABSOLUTE)
set(RUST_LIB_PATH "${CARGO_TARGET_DIR}/release/liblipilekhika_typing.so")

add_custom_target(lipilekhika_typing_rust ALL
  COMMAND
    "${CMAKE_COMMAND}" -E env
      CARGO_TARGET_DIR=${CARGO_TARGET_DIR}
      "${CARGO_EXECUTABLE}" build --release -p lipilekhika-fcitx5-binding
  WORKING_DIRECTORY "${LIPILEKHIKA_WORKSPACE_ROOT}"
  BYPRODUCTS "${RUST_LIB_PATH}"
  COMMENT "Building Rust lipilekhika typing C ABI"
  VERBATIM
)

# ---- Fcitx5 addon shared library ----

add_library(lipilekhika SHARED lipilekhika.cpp)
target_include_directories(lipilekhika PRIVATE
  "${LIPILEKHIKA_WORKSPACE_ROOT}/plugins/fcitx5/binding/include"
)
add_dependencies(lipilekhika lipilekhika_typing_rust)

# Link directly to the Rust-built shared library.
target_link_libraries(lipilekhika PRIVATE Fcitx5::Core Fcitx5::Config "${RUST_LIB_PATH}")
set_target_properties(lipilekhika PROPERTIES PREFIX "")

install(TARGETS lipilekhika DESTINATION "${FCITX_INSTALL_LIBDIR}/fcitx5")

# Install the Rust shared library next to the addon, and make the addon locate it at runtime.
install(PROGRAMS "${RUST_LIB_PATH}" DESTINATION "${FCITX_INSTALL_LIBDIR}/fcitx5")
set_target_properties(lipilekhika PROPERTIES
  BUILD_RPATH "${CARGO_TARGET_DIR}/release"
  INSTALL_RPATH "$ORIGIN"
)

# Addon registration file (library name must match: lipilekhika)
configure_file(lipilekhika-addon.conf.in lipilekhika-addon.conf)
install(
  FILES "${CMAKE_CURRENT_BINARY_DIR}/lipilekhika-addon.conf"
  RENAME lipilekhika.conf
  DESTINATION "${FCITX_INSTALL_PKGDATADIR}/addon"
)

# Input method registration file(s)
file(GLOB LIPILEKHIKA_INPUTMETHOD_CONFS
  "${CMAKE_CURRENT_LIST_DIR}/conf/lipilekhika-*.conf"
)
install(FILES ${LIPILEKHIKA_INPUTMETHOD_CONFS} DESTINATION "${FCITX_INSTALL_PKGDATADIR}/inputmethod")

