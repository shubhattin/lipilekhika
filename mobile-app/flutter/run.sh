#!/bin/bash
set -e

flutter emulators --launch Pixel_6a &
flutter run -d emulator
