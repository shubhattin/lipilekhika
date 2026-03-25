#!/bin/bash

set -e

bunx --package @napi-rs/cli napi build --platform --release --manifest-path Cargo.toml --package-json-path ../package.json --output-dir pkg --js index.cjs --dts index.d.ts --package node_binding

cat > pkg/index.mjs <<'EOF'
import nativeMod from './index.cjs';

export const { transliterate, NativeTypingContext } = nativeMod;
export default nativeMod;
EOF