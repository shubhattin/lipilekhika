#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

(
  cd "$SCRIPT_DIR/wasm" || exit 1
  rm -rf pkg
  ./gen_wasm.sh
  echo "WASM generated"
)

(
  cd "$SCRIPT_DIR/binding" || exit 1
  rm -rf pkg
  ./gen_node_bind.sh
  echo "N-API Binding generated"
)
