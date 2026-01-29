cargo ndk -t arm64-v8a -t armeabi-v7a -t x86_64 -t x86 \
            -o ../lipilekhika/android/src/main/jniLibs \
            build --release