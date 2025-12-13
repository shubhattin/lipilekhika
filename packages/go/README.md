# lipilekhika (Go)

Go port of the transliteration engine from `packages/js`.

## API

- `func Transliterate(text, from, to string, options map[string]bool) (string, error)`
- `func PreloadScriptData(name string) error`
- `func GetAllOptions(from, to string) ([]string, error)`
- `func GetNormalizedScriptName(name string) (string, bool)`

## Data

This package embeds:

- `data/script_data/*.json` (copied from `packages/js/src/script_data`)
- `data/custom_options.json` (copied from `packages/js/src/custom_options.json`)

If the JS data changes, re-copy those files into `packages/go/data/`.

## Tests

From `packages/go/`:

```bash
go test ./...
```

This runs the shared fixture suite in `test_data/transliteration/**/*.yaml`.


