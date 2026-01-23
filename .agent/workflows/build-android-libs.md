---
description: Build Android native libraries for the lipilekhika Dart package
---

# Build Android Native Libraries

This workflow builds the Rust lipilekhika library for Android architectures.

## Prerequisites

// turbo-all

1. Install Rust Android targets:
```bash
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android
```

2. Install cargo-ndk:
```bash
cargo install cargo-ndk
```

3. Set ANDROID_NDK_HOME (typically at `$ANDROID_HOME/ndk/<version>`):
```bash
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/$(ls $ANDROID_HOME/ndk | head -1)
```

## Build Steps

4. First run the standard rebuild script to generate bindings:
```bash
cd /home/shubhattin/yojanAni/lipi/lipilekhika/packages/dart
./rebuild.sh
```

5. Build for all Android architectures:
```bash
cd /home/shubhattin/yojanAni/lipi/lipilekhika/packages/dart/binding
cargo ndk -t arm64-v8a -t armeabi-v7a -t x86_64 -t x86 -o ../lipilekhika/android/src/main/jniLibs build --release
```

## Verification

6. Verify the libraries were built:
```bash
ls -la /home/shubhattin/yojanAni/lipi/lipilekhika/packages/dart/lipilekhika/android/src/main/jniLibs/*/
```

7. Run the Flutter app:
```bash
cd /home/shubhattin/yojanAni/lipi/lipilekhika/mobile-app/flutter
flutter run -d emulator-5554
```

## Notes

- Library name must be `liblipilekhika_dart.so` (matches flutter_rust_bridge expectation)
- jniLibs folder is gitignored; rebuild after fresh clone
