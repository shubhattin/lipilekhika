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
bun run bench              # run benchmarks
bun run test:run           # run tests once
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
./bench/run_release.sh                     # benchmarks
```

## Questions & issues

**Repository**: [github.com/shubhattin/lipilekhika](https://github.com/shubhattin/lipilekhika) · **Issues**: [Report here](https://github.com/shubhattin/lipilekhika/issues)
