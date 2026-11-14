#!/bin/sh
# Lipi Lekhika for macOS: lipilekhika-<version>-macos.dmg with "Lipi Lekhika.app" (the
# typing tool, Lipi Parivartaka and the typing help), one binary for Apple silicon and Intel Macs.
# The disk image shows the app next to a link to Applications: dragging it there installs it.
# Run on a Mac, after
#   cargo build --release -p lipilekhika-ui --target aarch64-apple-darwin
#   cargo build --release -p lipilekhika-ui --target x86_64-apple-darwin
#   packaging/bundle-macos.sh <arm64 binary> <x86_64 binary> <version> [out dir]
# BUILD (env) is the app's build number (default: the version), to tell test builds apart.
# Signed with the identity in MACOS_SIGN_IDENTITY (the release signs with the project's own
# self-signed certificate: the signer stays the same from one release to the next, so macOS keeps
# the Accessibility permission across updates), or ad hoc when it is not set. Neither is an Apple
# Developer ID: macOS asks to allow the app on its first start either way.
set -eu

arm=$1
intel=$2
version=$3
build=${BUILD:-$version}
out=$(mkdir -p "${4:-.}" && cd "${4:-.}" && pwd)
here=$(cd "$(dirname "$0")" && pwd)

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
stage="$tmp/stage"
app="$stage/Lipi Lekhika.app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"

# one binary for both kinds of Mac (the same binary twice: a build for this Mac only, CI's check)
if [ "$arm" = "$intel" ]; then
  cp "$arm" "$app/Contents/MacOS/lipilekhika"
else
  lipo -create -output "$app/Contents/MacOS/lipilekhika" "$arm" "$intel"
fi
lipo -info "$app/Contents/MacOS/lipilekhika"
sed -e "s/@VERSION@/$version/g" -e "s/@BUILD@/$build/g" "$here/macos/Info.plist" > "$app/Contents/Info.plist"
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
codesign --force --timestamp=none --sign "$identity" "$app"
codesign --verify --strict --verbose "$app"
# what macOS checks an update against to keep the permission: with the project's certificate it
# names the certificate (the same for every release), ad hoc only this build's hash
codesign --display --requirements - "$app"

# the disk image: the app and a link to Applications
ln -s /Applications "$stage/Applications"
dmg="$out/lipilekhika-$version-macos.dmg"
rm -f "$dmg"
# the disk image itself is not signed: macOS checks a signed image when it is opened and refuses
# one with a self-signed certificate ("Not Opened"), an unsigned one just opens. The app in it is
# signed, that is what macOS checks at its first start and for the Accessibility permission.
hdiutil create -volname "Lipi Lekhika" -srcfolder "$stage" -fs HFS+ -format UDZO -ov "$dmg"
hdiutil verify "$dmg"
echo "$dmg"
