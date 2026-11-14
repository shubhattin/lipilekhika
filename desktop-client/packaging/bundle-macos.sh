#!/bin/sh
# Lipi Parivartaka for macOS: lipiparivartaka-<version>-macos-universal.zip with
# "Lipi Parivartaka.app", one binary for Apple silicon and Intel Macs. Run on a Mac, after
#   cargo build --release -p lipilekhika-ui --no-default-features --target aarch64-apple-darwin
#   cargo build --release -p lipilekhika-ui --no-default-features --target x86_64-apple-darwin
#   packaging/bundle-macos.sh <arm64 binary> <x86_64 binary> <version> [out dir]
# Signed with the identity in MACOS_SIGN_IDENTITY (the release signs with the project's own
# self-signed certificate, so the signer stays the same from one release to the next), or ad hoc
# when it is not set. Neither is an Apple Developer ID: macOS asks to allow the app on its first
# start either way.
set -eu

arm=$1
intel=$2
version=$3
out=$(mkdir -p "${4:-.}" && cd "${4:-.}" && pwd)
here=$(cd "$(dirname "$0")" && pwd)

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
app="$tmp/Lipi Parivartaka.app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"

# one binary for both kinds of Mac
lipo -create -output "$app/Contents/MacOS/lipiparivartaka" "$arm" "$intel"
lipo -info "$app/Contents/MacOS/lipiparivartaka"
sed "s/@VERSION@/$version/g" "$here/macos/Info.plist" > "$app/Contents/Info.plist"
plutil -lint "$app/Contents/Info.plist"

# the icon, in the sizes macOS shows
iconset="$tmp/AppIcon.iconset"
mkdir -p "$iconset"
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$here/../assets/icon_512.png" --out "$iconset/icon_${size}x${size}.png" >/dev/null
  double=$((size * 2))
  if [ "$double" -le 512 ]; then
    sips -z "$double" "$double" "$here/../assets/icon_512.png" --out "$iconset/icon_${size}x${size}@2x.png" >/dev/null
  fi
done
iconutil -c icns "$iconset" -o "$app/Contents/Resources/AppIcon.icns"

# Apple silicon runs only signed code, the merged binary needs a new signature
identity="${MACOS_SIGN_IDENTITY:--}"
codesign --force --deep --timestamp=none --sign "$identity" "$app"
codesign --display --requirements - "$app"
codesign --verify --verbose "$app"

zip="$out/lipiparivartaka-$version-macos-universal.zip"
rm -f "$zip"
ditto -c -k --keepParent "$app" "$zip"
echo "$zip"
