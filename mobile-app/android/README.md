# Lipi Lekhika Android app

The native Android app, in Kotlin with Jetpack Compose (Material 3). It uses the Rust library through the internal Kotlin package ([`packages/kotlin`](../../packages/kotlin), JNI), which Gradle builds with it (an included build). It replaces the Flutter app (kept in [`../flutter`](../flutter)) as an update: same app id `com.shubhattin.lipilekhika`, same signing key, its settings are taken over.

## What it does

- **Transliterate**, like the web app's `/app`:
  - **Scripts**: a searchable script picker (Modern / Latin / Ancient sections, aliases like `hi`, `tam`, `hk`).
  - **Typing**: realtime typing (English keys type in the script, toggled with the "Typing" pill), with quick toggles for the inherent vowel (`k → क`) and native numerals (`1 → १`).
  - **Converting**: auto convert or a Convert button, Swap, and Copy.
  - **Text tools**: Open / Save `.txt`, Undo / Redo, Clear with "Undo clear / open", and the text kept between launches.
  - **Options**: the preset, the transliteration options, and the typing help (Typing map / Compare).
- **Elsewhere on the phone**:
  - **Select text in any app → "Lipi Lekhika"**: a small sheet converts it. Replace puts the result in place of the selection, or Copy copies it. The script of the text is guessed.
  - **Share → Lipi Lekhika**: the text opens in the app.
  - **Quick Settings tile "Convert clipboard"**: add it in the edit mode of the Quick Settings panel. It converts the text on the clipboard.
- **App**: About, the theme (Auto / Light / Dark), and PostHog app lifecycle events (release builds with a key only).

## Running it (no Android Studio needed)

Requirements are the ones of the [Kotlin package](../../CONTRIBUTING.md#kotlin-package-packageskotlin): Rust, cargo-ndk with the Android targets, a JDK 17+, and the Android SDK with the NDK. You also need a phone with USB debugging on, or a phone over Wi-Fi (`adb pair`, `adb connect`).

```sh
./run.sh            # build, install, start, and show the app's logs (like `flutter run`)
./run.sh --watch    # and rebuild + restart when a source file changes
```

While it runs: `r` rebuild and restart, `s` restart, `c` clear, `q` quit. It builds the Rust library only for the phone's ABI, and installs the debug build (`com.shubhattin.lipilekhika.debug`, next to the released app). `./run.sh --help` lists the options.

Other commands (from this folder):

```sh
./gradlew :app:assembleDebug -Plipilekhika.abis=arm64-v8a   # an APK in app/build/outputs/apk/debug
./gradlew :app:testDebugUnitTest                             # unit tests
./gradlew :app:lintDebug                                     # Android lint
./gradlew spotlessApply                                      # format (ktfmt)
```

## Code

The code under `app/src/main/kotlin/com/shubhattin/lipilekhika`. A web developer can read it like this:

| Here | Like on the web |
| --- | --- |
| `@Composable fun Thing(a: X, onChange: (Y) -> Unit)` | a component and its props |
| `remember { mutableStateOf(...) }` in a composable | component state (`useState`, `let x = $state()`) |
| `state/AppStore.kt`, its `var x by mutableStateOf(...)` | a store (Svelte writable / `$state` in a `.svelte.ts`); the screens read it and call its functions |
| `snapshotFlow { ... }` in the store, `LaunchedEffect` | `$effect` / `useEffect` |
| `content: @Composable () -> Unit` parameters | children / slots |
| `ui/theme/Theme.kt` | the CSS variables (the web app's colour tokens, Geist, radii) |

Layout of the code:
- `data/`: the script metadata, the options and presets, the saved settings, `.txt` files, and script detection. It is the same data as the web app, so keep the two in sync.
- `state/`: the store.
- `ui/`: the screens and components (`typinghelp/` is the typing guide).
- `quick/`: the selected-text sheet and the clipboard tile.

The fonts of the scripts are the files of `desktop-client/assets/fonts`, added to the app's assets by the build (Geist, the UI font, is `app/src/main/res/font`, OFL).

## Releasing

See [Releasing in CONTRIBUTING.md](../../CONTRIBUTING.md#releasing). The version is `app.versionName` / `app.versionCode` in `gradle.properties`. The split APKs get the version code ABI × 1000 + `versionCode`, as the Flutter app did, so they install over it.
