#!/bin/bash
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f "build/lipilekhika_bench" ]; then
    echo "Error: C++ benchmark executable not found. Please compile first by running ./compile.sh"
    exit 1
fi

echo "Running C++ Lipilekhika benchmark suite..."
./build/lipilekhika_bench
