# General Instructions
- Always **squash merge** pull requests, unless told otherwise
- Also start some work on a feature/fix in a new branch
- Read [CONTRIBUTING.md](CONTRIBUTING.md) before working in the repo: it covers the setup, how the tests and test data work, and how to build and test each package (script data, JS, Rust, Python, Go)
- Format the code you changed before committing, using that package's formatter: `bun run format` (JS/TS/Svelte, in `lipi_script_data`, `packages/js` or `docs/docs-and-web-client`), `cargo fmt --all` (Rust), `uvx ruff format` (Python), `gofmt -w` (Go), `dart format` (Dart), `./gradlew spotlessApply` (Kotlin, from `packages/kotlin` or `mobile-app/android`). The exact commands are in [CONTRIBUTING.md](CONTRIBUTING.md#formatting)
- For Python also lint and typecheck: `uvx ruff check .` and `uvx ty check` (CI runs `ty check`), from `packages/python`

## Script data

- The script data of all packages lives in [`lipi_script_data`](lipi_script_data) (input data, schemas, script/language list, generator). After changing it run `bun run make-script-data` from the repo root and commit the regenerated Rust/Go/Python files

## Javascript

- Use bun package manager
- The repo root is a bun workspace (root, `lipi_script_data`, `packages/js`) with a single `bun.lock`: run `bun install` from the root. `docs/docs-and-web-client` is not in the workspace and has its own `bun.lock`
- The workspace uses TypeScript 7 (native `tsc`, no compiler API: tools that need the API, like API Extractor, bring their own TypeScript)
