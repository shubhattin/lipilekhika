#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$ROOT_DIR/bench/.tmp"
BIN_PATH="$BIN_DIR/benchmark"

mkdir -p "$BIN_DIR"

pushd "$ROOT_DIR" >/dev/null

go build -trimpath -ldflags='-s -w' -o "$BIN_PATH" ./bench

"$BIN_PATH" "$@"

popd >/dev/null
