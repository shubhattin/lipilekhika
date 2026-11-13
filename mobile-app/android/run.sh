#!/usr/bin/env bash
# Builds the app, installs it on a connected phone (or emulator) and runs it, showing its logs:
# like `flutter run`, without Android Studio.
#
#   ./run.sh                 debug build on the connected device
#   ./run.sh -d <serial>     on this device (see `adb devices`), when several are connected
#   ./run.sh --watch         rebuild and restart whenever a source file changes
#   ./run.sh --release       the release build (signed with the debug key unless the release
#                            keystore is set, see the README)
#   ./run.sh --no-logs       only install and start it
#
# While it runs:  r  rebuild, reinstall and restart     s  restart (no rebuild)
#                 c  clear the screen                   q  quit (the app keeps running)
#
# A phone over Wi-Fi: on the phone Developer options → Wireless debugging → Pair device with
# pairing code, then `adb pair <ip:port>` and `adb connect <ip:port>`.
set -euo pipefail

cd "$(dirname "$0")"
ROOT="$(cd ../.. && pwd)"

SERIAL="${ANDROID_SERIAL:-}"
WATCH=0
LOGS=1
VARIANT=debug
while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--device) SERIAL="$2"; shift 2 ;;
    --watch|-w) WATCH=1; shift ;;
    --release) VARIANT=release; shift ;;
    --no-logs) LOGS=0; shift ;;
    -h|--help) awk 'NR > 1 && /^#/ { sub(/^# ?/, ""); print; next } NR > 1 { exit }' "$0"; exit 0 ;;
    *) echo "unknown option: $1 (see ./run.sh --help)"; exit 2 ;;
  esac
done

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
info() { printf '\033[36m▸ %s\033[0m\n' "$*"; }
fail() { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ---- the Android SDK and adb ----
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [[ -z "$SDK" && -f local.properties ]]; then
  SDK="$(sed -n 's/^sdk\.dir=//p' local.properties)"
fi
[[ -z "$SDK" && -d "$HOME/Android/Sdk" ]] && SDK="$HOME/Android/Sdk"
[[ -n "$SDK" && -d "$SDK" ]] || fail "Android SDK not found: set ANDROID_HOME (or sdk.dir in local.properties)"
[[ -f local.properties ]] || echo "sdk.dir=$SDK" > local.properties
ADB="$SDK/platform-tools/adb"
[[ -x "$ADB" ]] || ADB="$(command -v adb || true)"
[[ -n "$ADB" ]] || fail "adb not found (install the platform-tools: sdkmanager platform-tools)"

# ---- the device ----
mapfile -t DEVICES < <("$ADB" devices | awk 'NR>1 && $2=="device" {print $1}')
if [[ -z "$SERIAL" ]]; then
  case "${#DEVICES[@]}" in
    0) fail "no device connected: plug in the phone with USB debugging on (or adb connect <ip:port>)" ;;
    1) SERIAL="${DEVICES[0]}" ;;
    *)
      echo "Several devices are connected:"
      for i in "${!DEVICES[@]}"; do
        model="$("$ADB" -s "${DEVICES[$i]}" shell getprop ro.product.model 2>/dev/null | tr -d '\r')"
        echo "  $((i + 1))) ${DEVICES[$i]}  $model"
      done
      read -rp "Which one? " n
      SERIAL="${DEVICES[$((n - 1))]:-}"
      [[ -n "$SERIAL" ]] || fail "no such device"
      ;;
  esac
fi
export ANDROID_SERIAL="$SERIAL"
adb_() { "$ADB" -s "$SERIAL" "$@"; }
ABI="$(adb_ shell getprop ro.product.cpu.abi | tr -d '\r')"
MODEL="$(adb_ shell getprop ro.product.model | tr -d '\r')"

PACKAGE=com.shubhattin.lipilekhika
[[ "$VARIANT" == debug ]] && PACKAGE="$PACKAGE.debug"
ACTIVITY=com.shubhattin.lipilekhika.MainActivity
TASK="install${VARIANT^}"
bold "Lipi Lekhika ($VARIANT) on $MODEL ($SERIAL, $ABI)"

# ---- build, install, start, logs ----
build() {
  info "building and installing (./gradlew :app:$TASK, Rust for $ABI only)"
  # the Rust library is built only for the ABI of the device: much faster
  ./gradlew --console=plain -q ":app:$TASK" "-Plipilekhika.abis=$ABI"
}

start() {
  adb_ shell am force-stop "$PACKAGE" >/dev/null 2>&1 || true
  adb_ shell am start -n "$PACKAGE/$ACTIVITY" >/dev/null
  info "started"
}

LOG_PID=""
stop_logs() {
  if [[ -n "$LOG_PID" ]]; then
    kill "$LOG_PID" 2>/dev/null || true
    wait "$LOG_PID" 2>/dev/null || true
    LOG_PID=""
  fi
}

logs() {
  [[ "$LOGS" == 1 ]] || return 0
  stop_logs
  local pid=""
  for _ in $(seq 1 50); do
    pid="$(adb_ shell pidof -s "$PACKAGE" 2>/dev/null | tr -d '\r' || true)"
    [[ -n "$pid" ]] && break
    sleep 0.1
  done
  if [[ -z "$pid" ]]; then
    info "the app is not running (did it crash? the full log: adb logcat)"
    return 0
  fi
  # only this app's lines (its process), in colour
  adb_ logcat -v color -T 1 --pid="$pid" &
  LOG_PID=$!
}

rebuild() {
  stop_logs
  if build; then start; logs; else printf '\033[31m✗ build failed\033[0m\n'; fi
}

trap 'stop_logs; stty sane 2>/dev/null || true' EXIT

build || fail "build failed"
start
logs

# ---- watch mode: rebuild on changes to the sources ----
WATCH_DIRS=(app/src "$ROOT/packages/kotlin/lipilekhika/src" "$ROOT/packages/kotlin/binding/src" "$ROOT/packages/rust/src")
STAMP="$(mktemp)"
changed() {
  # true (and touches the stamp) when a source file is newer than the last build
  if [[ -n "$(find "${WATCH_DIRS[@]}" -type f -newer "$STAMP" -print -quit 2>/dev/null)" ]]; then
    touch "$STAMP"
    return 0
  fi
  return 1
}

[[ "$WATCH" == 1 ]] && info "watching for changes (app/src, packages/kotlin, packages/rust)"
echo "keys: r rebuild · s restart · c clear · q quit"

# a key press, or every second a check for changes (watch mode)
while true; do
  key=""
  if read -rsn1 -t 1 key 2>/dev/null; then
    case "$key" in
      r) touch "$STAMP"; rebuild ;;
      s) stop_logs; start; logs ;;
      c) clear ;;
      q) break ;;
    esac
  elif [[ "$WATCH" == 1 ]] && changed; then
    sleep 0.3 # let an editor finish writing
    info "change detected"
    rebuild
  fi
done
rm -f "$STAMP"
