#!/usr/bin/env bash  
set -euo pipefail  
LD_LIBRARY_PATH=".:${LD_LIBRARY_PATH:-}" dart test  