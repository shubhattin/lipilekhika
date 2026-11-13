#!/bin/sh
# Lipi Parivartaka for Linux: lipiparivartaka-<version>-linux-<arch>.tar.gz from a binary built
# with `cargo build --release -p lipilekhika-ui --no-default-features`.
#   packaging/bundle-linux.sh <binary> <version> [out dir]
set -eu

bin=$1
version=$2
out=$(mkdir -p "${3:-.}" && cd "${3:-.}" && pwd)
here=$(cd "$(dirname "$0")" && pwd)
arch=$(uname -m)
name="lipiparivartaka-$version-linux-$arch"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
stage="$tmp/$name"
mkdir -p "$stage"
install -m 755 "$bin" "$stage/lipiparivartaka"
install -m 755 "$here/linux/install.sh" "$stage/install.sh"
install -m 644 "$here/linux/lipiparivartaka.desktop" "$here/linux/README.txt" "$stage/"
install -m 644 "$here/../assets/icon_512.png" "$stage/lipiparivartaka.png"
install -m 644 "$here/../../LICENCE" "$stage/LICENSE.txt"

tar -C "$tmp" -czf "$out/$name.tar.gz" "$name"
echo "$out/$name.tar.gz"
