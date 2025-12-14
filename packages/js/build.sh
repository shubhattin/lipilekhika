#!/bin/bash

bun run make-script-data
bun vite build
bun api-extractor run --local > /dev/null 2>&1
rm -rf dist/types