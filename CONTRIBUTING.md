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
bun run bench              # cold single-pass benchmark (see Benchmarks below)
bun run bench:suite        # statistical benchmark suite (mitata), bench:suite:bun for Bun
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
cargo bench             # statistical benchmark suite (criterion), see Benchmarks below
```

## Python package (`packages/python`)

Requires [**uv**](https://docs.astral.sh/uv/) (manages Python >= 3.10 via [`.python-version`](packages/python/.python-version)).

From `packages/python`:

```sh
uv sync                                    # create .venv and install deps
uvx maturin develop --release              # build Rust Python bindings
uv run pytest                              # tests
uvx ty check                               # typecheck
uv run pytest benchmarks/bench_lipilekhika.py  # statistical benchmark suite (see Benchmarks below)
```

## Go package (`packages/go/lipilekhika`)

Requires [**Go**](https://go.dev) >= 1.23. Run `bun run make-script-data` in `packages/js` first.

From `packages/go/lipilekhika`:

```sh
go test ./... -v                           # tests
go run ./bench/benchmark.go                # cold single-pass benchmark (see Benchmarks below)
go test -run '^$' -bench . -benchmem       # statistical benchmark suite
```

## Benchmarks

Every package has two kinds of benchmark over the same [`test_data/`](test_data/) cases (`bun run gen:test-data`), using the generated script data. **Run both**: the statistical suite to judge a change, the cold pass to see first-run latency and a quick cross-language table.

The generated data is gitignored, so **after switching branches rerun `bun run make-script-data`** in `packages/js`, otherwise you measure the previous branch's data.

### Statistical suites (use these to compare two versions)

Warm-up, many samples and statistics (spread / percentiles, memory or allocations). They share the workloads of the rust criterion bench: one full pass over the transliteration cases, typing emulation of the `Normal` cases, and the typing cases.

| Package | Command (from the package directory) | Tool |
| --- | --- | --- |
| Rust | `cargo bench` | [criterion](https://github.com/bheisler/criterion.rs), reports the change vs the previous run |
| JS, Node | `bun run bench:suite` | [mitata](https://github.com/evanwashere/mitata) (vite-node), JS vs WASM vs N-API |
| JS, Bun | `bun run bench:suite:bun` | same suite under Bun |
| Go | `go test -run '^$' -bench . -benchmem -count 10` | `testing.B`, compare runs with [benchstat](https://pkg.go.dev/golang.org/x/perf/cmd/benchstat) |
| Python | `uv run pytest benchmarks/bench_lipilekhika.py` | [pytest-benchmark](https://pytest-benchmark.readthedocs.io) |

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
| JS, Node | `bun run bench` | [`src/scripts/benchmark.ts`](packages/js/src/scripts/benchmark.ts) with vite-node, also WASM and N-API rows |
| JS, Bun | `bun src/scripts/benchmark.ts` | same script under Bun |
| Go | `go run ./bench/benchmark.go` | [`bench/benchmark.go`](packages/go/lipilekhika/bench/benchmark.go), `-iterations N` repeats it (times are **totals over all iterations**); `./bench/run_release.sh` runs a stripped build with the same flags |
| Python | `uv run python scripts/benchmark.py` | [`scripts/benchmark.py`](packages/python/scripts/benchmark.py) |

- **Iterated** transliterates each case on its own (with its options); **bulk** joins the cases of each script pair into one input (without options).

### Notes

- JS WASM / N-API numbers and Python run the rust build: rebuild it after rust changes (`./get_bindings.sh` in `packages/js`, `uvx maturin develop --release` in `packages/python`).
- Absolute times depend on the machine; compare versions on the same machine and report the relative change.

## Questions & issues

**Repository**: [github.com/shubhattin/lipilekhika](https://github.com/shubhattin/lipilekhika) · **Issues**: [Report here](https://github.com/shubhattin/lipilekhika/issues)
