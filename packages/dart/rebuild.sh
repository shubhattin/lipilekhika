#!/bin/bash
set -e  # Exit on error

echo "🧹 Cleaning generated and compiled files..."

# Navigate to the dart package directory
cd "$(dirname "$0")/lipilekhika"

# Remove generated Dart FFI bindings
if [ -d "lib/src/rust" ]; then
  echo "  ✓ Removing generated Dart files: lib/src/rust/"
  rm -rf lib/src/rust
fi

# Remove generated freezed files
echo "  ✓ Removing freezed generated files (*.freezed.dart)"
find lib -name "*.freezed.dart" -type f -delete 2>/dev/null || true

# Remove compiled libraries
echo "  ✓ Removing compiled libraries (*.so, *.dylib, *.dll)"
rm -f *.so *.dylib *.dll 2>/dev/null || true

# Navigate to binding directory
cd ../binding

# Remove generated Rust FFI code
if [ -f "src/frb_generated.rs" ]; then
  echo "  ✓ Removing generated Rust file: src/frb_generated.rs"
  rm -f src/frb_generated.rs
fi

# Clean Rust build artifacts
echo "  ✓ Cleaning Rust build artifacts..."
cargo clean

echo ""
echo "🔨 Rebuilding everything..."
echo ""

# Navigate back to lipilekhika package
cd ../lipilekhika

# Generate Dart bindings
echo "📦 Generating Dart bindings with flutter_rust_bridge..."
flutter_rust_bridge_codegen generate

echo ""
echo "🦀 Building Rust library..."
cd ../binding
cargo build --release

echo ""
echo "📚 Installing Dart dependencies..."
cd ../lipilekhika
flutter pub get

echo ""
echo "🎯 Copying compiled library..."
cp ../../../target/release/liblipilekhika_dart.so .

echo ""
echo "✅ Build complete! You can now run:"
echo "   cd $(pwd)"
echo "   LD_LIBRARY_PATH=. dart run example/a.dart"
