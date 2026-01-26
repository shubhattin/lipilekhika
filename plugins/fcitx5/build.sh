#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

# Parse arguments
for arg in "$@"; do
  case $arg in
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Builds and installs Fcitx5 Lipilekhika addon system-wide to /usr"
      echo ""
      echo "Options:"
      echo "  --help      Show this help message"
      echo ""
      echo "Requires sudo for installation."
      exit 0
      ;;
  esac
done

PREFIX="/usr"
BUILD_DIR="${BUILD_DIR:-$SCRIPT_DIR/build}"
BUILD_TYPE="${BUILD_TYPE:-Release}"

echo "==> Building Fcitx5 Lipilekhika addon"
echo "    prefix:     ${PREFIX}"
echo "    build dir:  ${BUILD_DIR}"
echo "    build type: ${BUILD_TYPE}"

cmake -S "${SCRIPT_DIR}" -B "${BUILD_DIR}" \
  -DCMAKE_BUILD_TYPE="${BUILD_TYPE}" \
  -DCMAKE_INSTALL_PREFIX="${PREFIX}"

cmake --build "${BUILD_DIR}" -j
sudo cmake --install "${BUILD_DIR}"

# Remove any user-local configs that might override system installation
rm -f "$HOME/.config/environment.d/99-fcitx5-lipilekhika.conf"
rm -f "$HOME/.local/share/fcitx5/addon/lipilekhika.conf"
rm -f "$HOME/.local/share/fcitx5/inputmethod/lipilekhika-*.conf"

cat <<EOF

==> Installed system-wide to /usr/lib/fcitx5/

Cleaned up old user-local configs to prevent conflicts.

Next steps:
  - Restart fcitx5:    fcitx5 -rd
  - Add input method:  search "lipilekhika" in Fcitx5 config UI

No environment variable setup needed - fcitx5 will find the addon automatically.

EOF

