#!/bin/sh
# Lipi Parivartaka: puts it in your app menu (for your user, no root needed).
#   ./install.sh              install (or update)
#   ./install.sh --uninstall  remove it again
# It goes to ~/.local/bin, ~/.local/share/applications and ~/.local/share/icons. Its settings
# stay in ~/.local/share/lipilekhika.
set -eu

here=$(cd "$(dirname "$0")" && pwd)
data="${XDG_DATA_HOME:-$HOME/.local/share}"
bin="$HOME/.local/bin"
desktop="$data/applications/lipiparivartaka.desktop"
icon="$data/icons/hicolor/512x512/apps/lipiparivartaka.png"

refresh() {
  update-desktop-database "$data/applications" 2>/dev/null || true
  gtk-update-icon-cache -q "$data/icons/hicolor" 2>/dev/null || true
}

if [ "${1:-}" = "--uninstall" ]; then
  rm -f "$bin/lipiparivartaka" "$desktop" "$icon"
  refresh
  echo "Lipi Parivartaka removed (its settings stay in $data/lipilekhika)."
  exit 0
fi

mkdir -p "$bin" "$(dirname "$desktop")" "$(dirname "$icon")"
install -m 755 "$here/lipiparivartaka" "$bin/lipiparivartaka"
install -m 644 "$here/lipiparivartaka.png" "$icon"
# the full path: ~/.local/bin is not on every PATH the app menu uses
sed "s|^Exec=.*|Exec=$bin/lipiparivartaka|" "$here/lipiparivartaka.desktop" > "$desktop"
chmod 644 "$desktop"
refresh
echo "Lipi Parivartaka installed: find it in your app menu, or run $bin/lipiparivartaka"
