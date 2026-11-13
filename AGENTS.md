# General Instructions
- Always **squash merge** pull requests, unless told otherwise
- Also start some work on a feature/fix in a new branch
- Read [CONTRIBUTING.md](CONTRIBUTING.md) before working in the repo: it covers the setup, how the tests and test data work, and how to build and test each package (JS, Rust, Python, Go)
- Format the code you changed before committing, using that package's formatter: `bun run format` (JS/TS/Svelte), `cargo fmt --all` (Rust), `uvx ruff format` (Python), `gofmt -w` (Go), `dart format` (Dart), `./gradlew spotlessApply` (Kotlin, from `packages/kotlin` or `mobile-app/android`). The exact commands are in [CONTRIBUTING.md](CONTRIBUTING.md#formatting)
- For Python also lint and typecheck: `uvx ruff check .` and `uvx ty check` (CI runs `ty check`), from `packages/python`

## Javascript

- Use bun package manager
