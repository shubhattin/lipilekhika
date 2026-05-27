#!/bin/bash
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f "build/lipilekhika_test" ]; then
    echo "Error: C++ test executable not found. Please compile first by running ./compile.sh"
    exit 1
fi

echo "Running C++ Lipilekhika transliteration test suite..."
./build/lipilekhika_test
