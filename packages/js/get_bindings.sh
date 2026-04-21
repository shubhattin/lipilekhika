#!/bin/bash

cd wasm
rm -rf pkg
./gen_wasm.sh
echo "WASM generated"

cd ../binding
rm -rf pkg
./gen_node_bind.sh
echo "N-API Binding generated"

cd ..
