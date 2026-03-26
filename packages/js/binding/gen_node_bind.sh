#!/bin/bash

set -euo pipefail

OUTPUT_DIR="${OUTPUT_DIR:-pkg}"
TARGET="${TARGET:-}"

NAPI_BUILD_ARGS=(
  --platform
  --release
  --manifest-path Cargo.toml
  --package-json-path ../package.json
  --output-dir "$OUTPUT_DIR"
  --package node_binding
)

if [[ -n "$TARGET" ]]; then
  NAPI_BUILD_ARGS+=(--target "$TARGET")
fi

rm -rf "$OUTPUT_DIR"

bunx --package @napi-rs/cli napi build \
  "${NAPI_BUILD_ARGS[@]}" \
  --js index.cjs \
  --dts index.d.ts