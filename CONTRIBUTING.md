# Contributing

## Prerequisites

- [**Node.js**](https://nodejs.org) >= 20
- [**Bun**](https://bun.sh)

Install dependencies at the repo root and in `packages/js`:

```sh
bun install
cd packages/js && bun install
```

## Generate test data

From the repo root, generate transliteration test fixtures:

```sh
bun run gen:test-data
```

Output is written to `test_data/transliteration/`, alongside manual cases under [`test_data/`](test_data/) (e.g. `test_data/typing/`).

These are test cases generated from text data and older version of lipi lekhika, manual test cases are also there alongside it.

### Standard scheme test data (vidyut-lipi)

The test data of the standard romanization schemes (`test_data/transliteration/std-*/`) is generated from the output of [`vidyut-lipi`](https://github.com/ambuda-org/vidyut) (MIT) for the same inputs. Unlike the `auto-*` data it is **committed** and not regenerated in CI: rerun it by hand after changing the inputs or adding a scheme, and review the diff. From [`scripts/tools/vidyut-test-data`](scripts/tools/vidyut-test-data) (needs only Cargo, it is not part of the workspace):

```sh
cargo run --release              # all the schemes
cargo run --release -- SLP1      # only some of them
```

Where lipilekhika writes differently from vidyut on purpose (eg. SLP1 `|` is written `Lh`), the generator changes the vidyut output, see `normalize_output` in [`src/main.rs`](scripts/tools/vidyut-test-data/src/main.rs).

## JS package (`packages/js`)

`make-script-data` also regenerates the committed Rust data, so it additionally needs [**Rust**](https://www.rust-lang.org) / [**Cargo**](https://doc.rust-lang.org/cargo/) with the `rustfmt` component (included by default with rustup). Without them the rest of the data is still generated, but it warns that the committed Rust data was not updated.

From `packages/js`:

```sh
bun run make-script-data   # generate script data (also regenerates the committed Rust/Go data)
bun run check              # typecheck
bun run build:lib          # only the ESM / CJS build of the package (`dist/esm`, `dist/cjs`), 2 s
bun run bench              # cold single-pass benchmark (see Benchmarks below), bench:bun for Bun
bun run bench:suite        # statistical benchmark suite (mitata), bench:suite:bun for Bun
bun run test:run           # run tests once
bun run test:runtime       # JS, WASM and N-API under vite-node and bun (needs bindings)
bun run test:runtime:dist  # same against the built package, under node and bun (after `bun run build`)
bun run test:workerd       # `lipilekhika/wasm` in the Cloudflare Workers runtime (workerd, after `bun run build`)
```

Tests need native bindings — run once (or after binding changes in rust package):

```sh
./get_bindings.sh
```

### WASM & N-API bindings

`get_bindings.sh` builds both:

- **WASM** — `wasm/gen_wasm.sh` → `wasm/pkg/`
- **N-API** — `binding/gen_node_bind.sh` → `binding/pkg/`

## Rust package (`packages/rust`)

Requires [**Rust**](https://www.rust-lang.org) / [**Cargo**](https://doc.rust-lang.org/cargo/) >= 1.88. The script data is committed, so building needs only Cargo. Run `bun run gen:test-data` from the repo root before running the tests.

From `packages/rust`:

```sh
cargo check
cargo test              # or cargo test --release
cargo bench             # statistical benchmark suite (criterion), see Benchmarks below
```

#### Script data

The crate embeds generated files that are **committed to git**:

- `src/generated/lipi_data.bin` — bincode blob with the data of all scripts and the custom option rules
- `src/scripts.rs` — the `Script` / `ScriptListEnum` enums and the script/language/alias lists
- `src/custom_options.rs` — the `CustomOptions` struct and its builder

They are written by [`datagen/`](packages/rust/datagen) (`lipilekhika-datagen`, not published), which reads the JSON that `bun run make-script-data` copies into `packages/rust/data/` (gitignored). The Rust files are generated with `quote!` and formatted with `rustfmt` (needs the `rustfmt` component).

After changing script data, run `bun run make-script-data` in `packages/js` (it runs `cargo run -p lipilekhika-datagen`) and commit the updated files. Encoding is deterministic and a file is only rewritten when its content changes, so unchanged data never shows up in `git status`. CI fails if the committed files are out of date (`cargo run -p lipilekhika-datagen -- --check`).

## Python package (`packages/python`)

Requires [**uv**](https://docs.astral.sh/uv/) (manages Python >= 3.10 via [`.python-version`](packages/python/.python-version)).

From `packages/python`:

```sh
uv sync                                    # create .venv and install deps
uvx maturin develop --release              # build Rust Python bindings
uv run pytest                              # tests
uvx ty check                               # typecheck (CI runs it)
uvx ruff check .                           # lint (`--fix` applies the safe fixes)
uvx ruff format .                          # format
uv run pytest benchmarks/bench_lipilekhika.py  # statistical benchmark suite (see Benchmarks below)
```

Before committing Python changes run `uvx ruff format .`, `uvx ruff check .` and `uvx ty check`, all three must pass. Ruff and ty are not project dependencies and `uvx` runs their latest release, so a new release can report something new in unchanged code (ty renamed `empty-body`, which failed CI): fix it, don't silence it. The Ruff settings are in [`pyproject.toml`](packages/python/pyproject.toml) (`[tool.ruff]`).

## Go package (`packages/go/lipilekhika`)

Requires [**Go**](https://go.dev) >= 1.23. Run `bun run make-script-data` in `packages/js` first.

From `packages/go/lipilekhika`:

```sh
go test ./... -v                           # tests
go run ./bench/benchmark.go                # cold single-pass benchmark (see Benchmarks below)
go test -run '^$' -bench . -benchmem       # statistical benchmark suite
```

## Kotlin package (`packages/kotlin`)

Kotlin bindings of the Rust library for the native Android app ([UniFFI](https://mozilla.github.io/uniffi-rs/)). It is internal, not published (like the Dart package). See [its README](packages/kotlin/README.md) for the API.

Requires Rust, a JDK 17 or newer, the Android SDK (`ANDROID_HOME`, or `sdk.dir` in `packages/kotlin/local.properties`), and for the Android build the NDK (installed by Gradle) and [cargo-ndk](https://github.com/bbqsrc/cargo-ndk) with the Android Rust targets (`rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android`). The Gradle wrapper downloads Gradle. Run `bun run gen:test-data` first.

From `packages/kotlin`:

```sh
./gradlew :lipilekhika:testDebugUnitTest   # tests on this machine's JVM (test_data and the API)
./gradlew :lipilekhika:assembleRelease     # the AAR, with the library for each Android ABI
./gradlew spotlessApply                    # format (check: ./gradlew spotlessCheck)
```

- Gradle builds the Rust side itself: `cargoBuildHost` (the library for this machine, for the tests, and the `uniffi-bindgen` tool), `generateBindings` (the Kotlin code, into `build/generated/uniffi`), and `cargoNdk` (the Android libraries).
- `-Plipilekhika.abis=arm64-v8a` builds for only some ABIs (the default is in `gradle.properties`).

## Android app (`mobile-app/android`)

The native app (Kotlin, Jetpack Compose), on the Kotlin package above (an included Gradle build). It needs the same tools as the Kotlin package, and a phone with USB debugging on (or over Wi-Fi with `adb pair` / `adb connect`). No Android Studio is needed: `./run.sh` builds it, installs it, starts it and shows its logs, like `flutter run` (`--watch` rebuilds on changes). See [its README](mobile-app/android/README.md).

From `mobile-app/android`:

```sh
./run.sh                                  # run on the connected phone (r rebuild, q quit)
./gradlew :app:testDebugUnitTest          # unit tests
./gradlew :app:lintDebug                  # Android lint
./gradlew spotlessApply                   # format (check: ./gradlew spotlessCheck)
```

The old Flutter app is kept in `mobile-app/flutter` (with its old release workflow), see [its README](mobile-app/flutter/README.md).

## Desktop app (`desktop-client`)

The PC app (Lipi Lekhika, with Lipi Parivartaka and the typing help as its windows) is written in Rust with [GPUI](https://www.gpui.rs) and [GPUI Kit](https://gpui-kit.com). It is a member of the Cargo workspace, so `cargo fmt --all` covers it.

From the repo root:

```sh
cargo run -p lipilekhika-ui                    # the typing tool
cargo run -p lipilekhika-ui -- --parivartaka   # only Lipi Parivartaka (its start menu entry)
cargo run -p lipilekhika-ui -- --typing-help   # only the typing help (--compare for its Compare tab)
cargo test -p lipilekhika-ui
cargo run -p lipilekhika-ui --no-default-features   # Lipi Parivartaka on its own (the Linux/macOS download)
```

- The system wide typing (the keyboard hook, Alt+X) is there on Windows and macOS. On Linux the app runs without it (that typing is the [Fcitx5 plugin](plugins/fcitx5)); everything else works.
- Linux needs the usual GPUI libraries (`libxkbcommon`, `wayland`, `vulkan` drivers, `fontconfig`, `freetype`) and GTK 3 with `libayatana-appindicator` for the tray icon.
- GPUI builds are large (a debug `target/` is several GB): `CARGO_TARGET_DIR` can put it on another disk.
- `desktop-client/vendor/gpui-pre-linux` is a patched copy of GPUI's Linux backend, see [its README](desktop-client/vendor/README.md).
- The script fonts are bundled in the binary (`desktop-client/assets/fonts`).
- Releases: Windows gets the MSI and the portable zip (`bundle.ps1`; a `portable` file next to the exe makes it portable, see `src/portable.rs`, and `desktop-client/launcher` is its `Lipi Parivartaka.exe`). Linux and macOS get Lipi Parivartaka on its own, built without the default `typing-tool` feature (no main window, tray, keyboard hook or GTK) and packed by `desktop-client/packaging/bundle-linux.sh` / `bundle-macos.sh`.

## Formatting

Format your changes before committing. Run the formatter for each package you touched; every one of them can also be run in check mode (shown in the comments) to verify without writing.

| Code | Formatter | Run from | Command |
| --- | --- | --- | --- |
| JS package (`packages/js`) | [oxfmt](https://oxc.rs) | `packages/js` | `bun run format` (check: `bunx oxfmt --check`) |
| Docs & web client (`docs/docs-and-web-client`) | [Prettier](https://prettier.io) | `docs/docs-and-web-client` | `bun run format` (check: `bunx prettier --check .`) |
| All Rust crates (one Cargo workspace) | [rustfmt](https://github.com/rust-lang/rustfmt) | repo root | `cargo fmt --all` (check: `cargo fmt --all --check`) |
| Python package (`packages/python`) | [Ruff](https://docs.astral.sh/ruff/) | `packages/python` | `uvx ruff format .` (check: `uvx ruff format --check .`) |
| Go package (`packages/go/lipilekhika`) | gofmt | `packages/go/lipilekhika` | `gofmt -w .` (check: `gofmt -l .` lists unformatted files) |
| Kotlin package (`packages/kotlin`) | [ktfmt](https://github.com/facebook/ktfmt) (kotlinlang style) via [Spotless](https://github.com/diffplug/spotless) | `packages/kotlin` | `./gradlew spotlessApply` (check: `./gradlew spotlessCheck`) |
| Android app (`mobile-app/android`) | [ktfmt](https://github.com/facebook/ktfmt) (kotlinlang style) via [Spotless](https://github.com/diffplug/spotless) | `mobile-app/android` | `./gradlew spotlessApply` (check: `./gradlew spotlessCheck`) |
| Dart package & old Flutter app (`packages/dart/lipilekhika`, `mobile-app/flutter`) | [dart format](https://dart.dev/tools/dart-format) (ships with the Dart/Flutter SDK) | that directory | `dart format .` (check: `dart format --output=none --set-exit-if-changed .`) |

Notes:

- `rustfmt` comes with rustup by default; the per-crate settings live in the `rustfmt.toml` files (`packages/rust`, `desktop-client`).
- Ruff isn't a project dependency, so it runs through `uvx` (like `ty`); it also formats the Python code blocks in `packages/python/README.md`. For Python, also lint and typecheck before committing (`uvx ruff check .`, `uvx ty check`), see [Python package](#python-package-packagespython).
- The committed Rust script data is formatted by its generator (`datagen`), so `cargo fmt` leaves it unchanged. The flutter_rust_bridge output (`frb_generated.rs`) is gitignored, so whatever `cargo fmt` does to it doesn't show up in a diff.

## Benchmarks

Every package has two kinds of benchmark over the same [`test_data/`](test_data/) cases (`bun run gen:test-data`), using the generated script data. **Run both**: the statistical suite to judge a change, the cold pass to see first-run latency and a quick cross-language table.

The JS script data is gitignored (Rust and Go embed committed copies), so **after switching branches rerun `bun run make-script-data`** in `packages/js`, otherwise you measure the previous branch's data.

### Statistical suites (use these to compare two versions)

Warm-up, many samples and statistics (spread / percentiles, memory or allocations). They share the workloads of the rust criterion bench: one full pass over the transliteration cases, typing emulation of the `Normal` cases, and the typing cases.

| Package | Command (from the package directory) | Tool |
| --- | --- | --- |
| Rust | `cargo bench` | [criterion](https://github.com/bheisler/criterion.rs), reports the change vs the previous run |
| JS, Node | `bun run bench:suite` | [mitata](https://github.com/evanwashere/mitata) on the built package, JS vs WASM vs N-API |
| JS, Bun | `bun run bench:suite:bun` | same suite under Bun |
| Go | `go test -run '^$' -bench . -benchmem -count 10` | `testing.B`, compare runs with [benchstat](https://pkg.go.dev/golang.org/x/perf/cmd/benchstat) |
| Python | `uv run pytest benchmarks/bench_lipilekhika.py` | [pytest-benchmark](https://pytest-benchmark.readthedocs.io) |
| Kotlin | `./gradlew :lipilekhika:testDebugUnitTest --tests '*Benchmark*' -Plipilekhika.bench=true --rerun` | [`Benchmark.kt`](packages/kotlin/lipilekhika/src/test/kotlin/com/shubhattin/lipilekhika/core/Benchmark.kt) (JUnit, skipped in the normal test run), on this machine's JVM |

Comparing two versions (eg. `main` and your branch):

- **Go**: save each run, then compare (reports the change and whether it is significant):
  ```sh
  go test -run '^$' -bench . -benchmem -count 10 > old.txt   # on main
  go test -run '^$' -bench . -benchmem -count 10 > new.txt   # on your branch
  go run golang.org/x/perf/cmd/benchstat@latest old.txt new.txt
  ```
- **Python**: `--benchmark-autosave` on the first version, `--benchmark-compare` on the second.
- **JS**: `--json <file>` saves the results (`bun run bench:suite -- --json main.json`); `--filter <regex>` runs some groups only.
- **Rust**: `cargo bench` compares with the previous run automatically.

### Cold single-pass benchmarks

One timed pass without warm-up (JIT warm-up is included for JS), printing the same iterated / bulk table in every language. Expect noticeable run-to-run variation: run a few times, alternating between the versions you compare.

| Package | Command (from the package directory) | Notes |
| --- | --- | --- |
| Rust | `cargo run --example bench --release` | [`examples/bench.rs`](packages/rust/examples/bench.rs) |
| JS, Node | `bun run bench` | [`scripts/benchmark.mjs`](packages/js/scripts/benchmark.mjs) on the built package, also WASM and N-API rows |
| JS, Bun | `bun run bench:bun` | same script under Bun |
| Go | `go run ./bench/benchmark.go` | [`bench/benchmark.go`](packages/go/lipilekhika/bench/benchmark.go), `-iterations N` repeats it (times are **totals over all iterations**); `./bench/run_release.sh` runs a stripped build with the same flags |
| Python | `uv run python scripts/benchmark.py` | [`scripts/benchmark.py`](packages/python/scripts/benchmark.py) |

- **Iterated** transliterates each case on its own (with its options); **bulk** joins the cases of each script pair into one input (without options).

### Notes

- The JS benchmarks run the **built package** (`dist/esm`) under plain Node / Bun, the code a user of the package runs: each `bun run bench*` command first builds it (`bun run build:lib`), then runs the script in [`packages/js/scripts`](packages/js/scripts) (run the script directly to skip the build). They do not run the source with vite-node: it turns every import between files into a getter call, so the time depends on how the code is split into files (a refactor that only moved functions between files measured 30% slower, the built package was not slower).
- JS WASM / N-API numbers and Python run the rust build: rebuild it after rust changes (`./get_bindings.sh` in `packages/js`, `uvx maturin develop --release` in `packages/python`).
- Absolute times depend on the machine; compare versions on the same machine and report the relative change.

## Releasing

Every package and app except Go is released by its own GitHub Actions workflow, started by pushing a tag. The tag has to match the version in the version file, otherwise the workflow stops before it builds anything. The Go package has no workflow, its release is the tag itself: see [Go package](#go-package) below.

| What | Tag | Version in | Changelog | Workflow | Publishes to |
| --- | --- | --- | --- | --- | --- |
| JS package | `js-lib@v1.2.3` | `packages/js/package.json` | [`packages/js/CHANGELOG.md`](packages/js/CHANGELOG.md) | [`release_js.yml`](.github/workflows/release_js.yml) | npm (`lipilekhika`) |
| Rust crate | `rust-lib@v1.2.3` | `packages/rust/Cargo.toml` | [`packages/rust/CHANGELOG.md`](packages/rust/CHANGELOG.md) | [`release_rust.yml`](.github/workflows/release_rust.yml) | crates.io (`lipilekhika`), `parivartak` CLI binaries on the GitHub release |
| Python package | `python-lib@v1.2.3` | `packages/python/pyproject.toml` | [`packages/python/CHANGELOG.md`](packages/python/CHANGELOG.md) | [`release_python.yml`](.github/workflows/release_python.yml) | PyPI (`lipilekhika`) |
| PC app | `pc-app@v1.2.3` | `desktop-client/Cargo.toml` | [`desktop-client/CHANGELOG.md`](desktop-client/CHANGELOG.md) | [`release_pc_app.yml`](.github/workflows/release_pc_app.yml) | Windows MSI and portable zip, Lipi Parivartaka for Linux and macOS, on the GitHub release |
| Mobile app (Android) | `mobile-app@v1.2.3` | `mobile-app/android/gradle.properties` (`app.versionName=1.2.3`, `app.versionCode=<build number>`) | [`mobile-app/CHANGELOG.md`](mobile-app/CHANGELOG.md) | [`release_mobile_app.yml`](.github/workflows/release_mobile_app.yml) | APKs (arm64-v8a, armeabi-v7a, x86_64, universal) on the GitHub release, the AAB as a run artifact |

npm, PyPI and crates.io are published with trusted publishing (OIDC), so there are no registry tokens to set up. The npm and PyPI publish jobs run in the `release` environment.

### Steps

1. **Bump the version** in the version file and give the changelog a section for it: `## js-lib@1.2.3`, `## rust-lib@1.2.3`, `## python-lib@1.2.3`, `## pc-app@v1.2.3`, `## mobile-app@v1.2.3+<build number>`. For the mobile app, raise `app.versionCode` too (the build number after `+`). Commit this to `main`.

2. **Dry run (optional, recommended)**: start the workflow by hand with `dry_run`. It runs everything (tests, every build, the package checks) but publishes and uploads nothing:

   | Workflow | A dry run instead of publishing |
   | --- | --- |
   | JS | `npm publish --dry-run` |
   | Rust | `cargo publish --dry-run`, the `parivartak` binaries as run artifacts |
   | Python | `twine check --strict` on the wheels and the sdist (they stay as `wheels-*` run artifacts) |
   | PC app | the MSI as a run artifact |
   | Mobile app | no upload to the release (the APKs / AAB are run artifacts) |

   ```sh
   gh workflow run release_rust.yml -f tag=rust-lib@v1.2.3 -f dry_run=true
   ```

   The Rust, Python, PC app and mobile app workflows build the branch they are started from (`main` by default), so the tag does not have to exist yet. The JS workflow builds the commit of the tag, so for a JS dry run push the tag first (`git tag js-lib@v1.2.3 && git push origin js-lib@v1.2.3`), or dry-run after step 3. Pushing the tag starts the real release, so check the run it starts.

3. **Create the GitHub release** with the changelog section as its notes. This creates and pushes the tag, which starts the release workflow:

   ```sh
   # the changelog section of the version, followed by GitHub's generated list of merged PRs
   awk '/^## js-lib@1.2.3/{f=1;next} /^## /{if(f)exit} f' packages/js/CHANGELOG.md > /tmp/notes.md
   gh release create js-lib@v1.2.3 --generate-notes --notes-file /tmp/notes.md --target main
   ```

   The Rust, PC app and mobile app workflows upload their files to this release, so it has to exist (`gh release upload`). Create it this way instead of pushing only the tag.

4. **Watch the run** and check what it published:

   ```sh
   gh run list --workflow release_js.yml -L 1
   gh run watch <run id> --exit-status
   ```

   - npm: `npm view lipilekhika dist-tags` (npm can take a few minutes after the run to list the new version)
   - PyPI: `https://pypi.org/project/lipilekhika/1.2.3/`
   - crates.io: `https://crates.io/crates/lipilekhika/1.2.3`
   - PC / mobile app: the files on the GitHub release (`gh release view pc-app@v1.2.3`)

### If a release run fails

Fix the cause on `main`, then run the workflow again by hand with the existing tag:

```sh
gh workflow run release_js.yml -f tag=js-lib@v1.2.3 -f npm_dist_tag=latest
```

- A registry does not take the same version twice. Running again only works if the failed run did not publish (a failure in a build or check job stops before publishing).
- A manual JS run publishes under the npm dist-tag `beta` unless you pass `npm_dist_tag=latest`. A run started by the tag uses `latest`, or `beta` for prerelease versions like `1.2.3-beta.1`.
- A manual JS run builds the commit of the tag, with the workflow file of the branch it is started from, so a fix to the workflow on `main` applies to a tag created before it. The other workflows build the branch they are started from (`--ref`, default `main`). Use `--ref <tag>` to build the tagged commit with the workflow file as it was at that tag.

### Go package

Go has no package registry to publish to: a version of the module is a git tag of this repo, and Go fetches the code of the tagged commit.

- **Module path**: `github.com/shubhattin/lipilekhika/packages/go/lipilekhika` (the `module` line of [`go.mod`](packages/go/lipilekhika/go.mod)), which is also the import path.
- **Tag**: the module is in a subdirectory, so its version tags carry the directory as a prefix: `packages/go/lipilekhika/v1.2.3`. A tag without the prefix (`v1.2.3`, `go-lib@v1.2.3`) is not seen by Go.
- **Version**: only the tag has it, `go.mod` has no version field. The changelog is [`packages/go/lipilekhika/CHANGELOG.md`](packages/go/lipilekhika/CHANGELOG.md).
- **Script data**: the module embeds `data/gob/*.gob` (`//go:embed` in `data/embed.go`). They are committed, and the tagged commit is exactly what users download, nothing is built for them. `bun run make-script-data` regenerates them, and Go CI ([`go_ci.yml`](.github/workflows/go_ci.yml)) fails when they are out of date. So tag a commit of `main` whose Go CI passed.
- **Distribution**: on the first `go get` of a version, the Go module proxy (`proxy.golang.org`) downloads the tagged directory and keeps it, and the checksum database records its hash (users get it in `go.sum`). [pkg.go.dev](https://pkg.go.dev/github.com/shubhattin/lipilekhika/packages/go/lipilekhika) shows the documentation of the versions the proxy has.
- **A version can not be changed**: once the proxy has it, moving or re-creating the tag does not change what users get (and a direct download from git then fails the checksum check). Fix a bad release with a new version; a `retract` directive in `go.mod` marks the bad one.
- **Version numbers**: `v0.x.y` makes no compatibility promise. `v2.0.0` and later need the module path to end in `/v2` (`.../packages/go/lipilekhika/v2`), so go from `v0` to `v1`, not to `v2`.

Steps:

1. Give the changelog a section for the version (`## v1.2.3`), commit it to `main` and wait for Go CI to pass.

2. Tag that commit (an annotated tag, like the earlier ones) and push the tag:

   ```sh
   git tag -a packages/go/lipilekhika/v1.2.3 -m "packages/go/lipilekhika/v1.2.3"
   git push origin packages/go/lipilekhika/v1.2.3
   ```

3. GitHub release with the changelog section as its notes (only for the release notes, Go does not use it). Its title is the tag name, like the other releases:

   ```sh
   awk '/^## v1.2.3/{f=1;next} /^## /{if(f)exit} f' packages/go/lipilekhika/CHANGELOG.md > /tmp/notes.md
   gh release create packages/go/lipilekhika/v1.2.3 --verify-tag --generate-notes --notes-file /tmp/notes.md
   ```

4. Have the proxy fetch the version (otherwise the first user does that), then check it:

   ```sh
   GOPROXY=proxy.golang.org go list -m github.com/shubhattin/lipilekhika/packages/go/lipilekhika@v1.2.3
   curl https://proxy.golang.org/github.com/shubhattin/lipilekhika/packages/go/lipilekhika/@latest
   ```

   Then use it like a user, in an empty directory outside the repo:

   ```sh
   go mod init example.com/try
   go get github.com/shubhattin/lipilekhika/packages/go/lipilekhika@v1.2.3
   ```

### Build tools

The release workflows pin the versions of the tools that build the native code: `@napi-rs/cli` (in `packages/js/binding/gen_node_bind.sh`), `ziglang`, `cargo-zigbuild`, `flutter_rust_bridge_codegen`, Flutter and `cargo-ndk`. Without a pin, a new release of one of them can break the build of a commit that built before. Update a pin on purpose, and dry-run the release workflow afterwards. `FRB_CODEGEN_VERSION` has to match the `flutter_rust_bridge` version in `packages/dart/binding/Cargo.toml` (in `dart_ci.yml`, and in the old Flutter workflow `mobile-app/flutter/release_mobile_app.yml`).

## Questions & issues

**Repository**: [github.com/shubhattin/lipilekhika](https://github.com/shubhattin/lipilekhika) · **Issues**: [Report here](https://github.com/shubhattin/lipilekhika/issues)
