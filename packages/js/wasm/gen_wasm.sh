#!/bin/bash

set -e

wasm-pack build --release --target web

if command -v wasm-opt >/dev/null 2>&1; then
  # Speed-oriented wasm-opt pass (default -O); skip -Oz to avoid trading runtime perf for size.
  wasm-opt -O pkg/lipilekhika_wasm_bg.wasm -o pkg/lipilekhika_wasm_bg.wasm
fi

du -sh pkg/lipilekhika_wasm_bg.wasm
