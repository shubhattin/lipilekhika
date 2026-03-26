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
  --js index.cjs
  --dts index.d.ts
  --package node_binding
)

if [[ -n "$TARGET" ]]; then
  NAPI_BUILD_ARGS+=(--target "$TARGET")
fi

bunx --package @napi-rs/cli napi build "${NAPI_BUILD_ARGS[@]}"

cat > "$OUTPUT_DIR/index.mjs" <<'EOF'
import nativeMod from './index.cjs';

export const { transliterate, NativeTypingContext } = nativeMod;
export default nativeMod;
EOF