# Lipi Lekhika script data

The script data shared by every package of Lipi Lekhika (JS, Rust, Go, Python, and through Rust the Dart and Kotlin bindings and the apps): the data of each script, the script and language list, the types of the data, and the generator that writes each package's copy.

```sh
bun run make-script-data   # from the repo root, or here
```

It is a private workspace package (`@lipilekhika/script-data`), not published. See [Script data in CONTRIBUTING.md](../CONTRIBUTING.md#script-data-lipi_script_data).

- [`src/input_data/`](src/input_data) — the data of each script
- [`src/lang_list/`](src/lang_list) — the script and language list (`langs.json`) and the aliases
- [`src/make_output_script_data.ts`](src/make_output_script_data.ts) — the generator
- [`Reference Data/`](Reference%20Data) — references and Unicode tables used for the data
