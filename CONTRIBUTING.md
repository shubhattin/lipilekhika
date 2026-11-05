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

## JS package (`packages/js`)

From `packages/js`:

```sh
bun run make-script-data   # generate script data (also required by Rust, Go)
bun run check              # typecheck
bun run bench              # run benchmarks (see Benchmarks below)
bun run test:run           # run tests once
bun run test:runtime       # JS, WASM and N-API under vite-node and bun (needs bindings)
bun run test:runtime:dist  # same against the built package, under node and bun (after `bun run build`)
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

Requires [**Rust**](https://www.rust-lang.org) / [**Cargo**](https://doc.rust-lang.org/cargo/) >= 1.85. Run `bun run make-script-data` in `packages/js` and `bun run gen:test-data` from the repo root first.

From `packages/rust`:

```sh
cargo check
cargo test              # or cargo test --release
cargo bench
```

## Python package (`packages/python`)

Requires [**uv**](https://docs.astral.sh/uv/) (manages Python >= 3.10 via [`.python-version`](packages/python/.python-version)).

From `packages/python`:

```sh
uv sync                                    # create .venv and install deps
uvx maturin develop --release              # build Rust Python bindings
uv run pytest                              # tests
uvx ty check                               # typecheck
```

## Go package (`packages/go/lipilekhika`)

Requires [**Go**](https://go.dev) >= 1.23. Run `bun run make-script-data` in `packages/js` first.

From `packages/go/lipilekhika`:

```sh
go test ./... -v                           # tests
go run ./bench/benchmark.go                # benchmarks (see Benchmarks below)
```

## Benchmarks

All benchmarks run over the cases in [`test_data/`](test_data/) (`bun run gen:test-data`) using the generated script data. The generated data is gitignored, so **after switching branches rerun `bun run make-script-data`** in `packages/js`, otherwise you measure the previous branch's data.

| Package | Command (from the package directory) | Notes |
| --- | --- | --- |
| JS, Node | `bun run bench` | runs `src/scripts/benchmark.ts` with vite-node |
| JS, Bun | `bun src/scripts/benchmark.ts` | same script under Bun |
| Rust | `cargo bench` | criterion: warm-up, many samples, reports the change vs the previous run |
| Rust (quick table) | `cargo run --example bench --release` | same iterated/bulk table as JS and Python |
| Python | `uv run python scripts/benchmark.py` | measures the installed build, run `uvx maturin develop --release` after Rust changes |
| Go | `go run ./bench/benchmark.go` | `-iterations N` repeats it; times are **totals over all iterations** |
| Go (release build) | `./bench/run_release.sh -iterations 5` | stripped build of the same benchmark, same flags |

- **Iterated** transliterates each case on its own (with its options); **bulk** joins the cases of each script pair into one input (without options).
- The JS benchmark also has WASM and N-API rows; they run the Rust build (`./get_bindings.sh`).
- Except `cargo bench`, these are a single timed pass without warm-up, so expect noticeable run-to-run variation. To compare two versions, run the same command a few times on each, alternating between them, and compare the ranges.

## Questions & issues

**Repository**: [github.com/shubhattin/lipilekhika](https://github.com/shubhattin/lipilekhika) · **Issues**: [Report here](https://github.com/shubhattin/lipilekhika/issues)
