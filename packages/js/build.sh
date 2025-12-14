#!/bin/bash

# Exit on error
set -e

bun run make-script-data
bun vite build
bun api-extractor run --local > /dev/null 2>&1
rm -rf dist/types
rm -f tsdoc-metadata.json