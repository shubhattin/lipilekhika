package main

import (
	"bytes"
	"encoding/gob"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/scriptdata"
)

func main() {
	root, err := findModuleRoot()
	if err != nil {
		panic(err)
	}

	sourceDir := filepath.Join(root, "data")
	outDir := filepath.Join(root, "data", "gob")

	scriptData, err := readScriptData(filepath.Join(sourceDir, "script_data.json"))
	if err != nil {
		panic(err)
	}

	scriptList, err := readScriptList(filepath.Join(sourceDir, "script_list.json"))
	if err != nil {
		panic(err)
	}

	customOptions, err := readCustomOptions(filepath.Join(sourceDir, "custom_options.json"))
	if err != nil {
		panic(err)
	}

	if err := os.MkdirAll(outDir, 0o755); err != nil {
		panic(fmt.Errorf("create output dir %s: %w", outDir, err))
	}

	if err := writeGob(filepath.Join(outDir, "script_data.gob"), scriptdata.NewScriptDataBlob(scriptData)); err != nil {
		panic(err)
	}
	if err := writeGob(filepath.Join(outDir, "script_list.gob"), scriptdata.NewScriptListBlob(scriptList)); err != nil {
		panic(err)
	}
	if err := writeGob(filepath.Join(outDir, "custom_options.gob"), scriptdata.NewCustomOptionsBlob(customOptions)); err != nil {
		panic(err)
	}
}

func findModuleRoot() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	current := wd
	for {
		if _, err := os.Stat(filepath.Join(current, "go.mod")); err == nil {
			return current, nil
		}

		parent := filepath.Dir(current)
		if parent == current {
			return "", fmt.Errorf("could not find go.mod from %q", wd)
		}
		current = parent
	}
}

func readScriptData(path string) (map[string]scriptdata.ScriptData, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}
	out := map[string]scriptdata.ScriptData{}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("parse %s: %w", path, err)
	}
	return out, nil
}

func readScriptList(path string) (scriptdata.ScriptListJSON, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return scriptdata.ScriptListJSON{}, fmt.Errorf("read %s: %w", path, err)
	}
	var out scriptdata.ScriptListJSON
	if err := json.Unmarshal(raw, &out); err != nil {
		return scriptdata.ScriptListJSON{}, fmt.Errorf("parse %s: %w", path, err)
	}
	return out, nil
}

func readCustomOptions(path string) (map[string]scriptdata.CustomOption, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}
	out := map[string]scriptdata.CustomOption{}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("parse %s: %w", path, err)
	}
	return out, nil
}

// writeGob writes `data` to `path` unless the existing file already holds the same data.
//
// gob assigns type ids from a process-wide counter, so the bytes of a file depend on the
// types encoded before it in the same run (e.g. a field change in the script data shifts
// the ids inside script_list.gob too). To keep these committed binaries free of such
// no-op diffs, the existing file is decoded and re-encoded next to the new data in this
// process: both then share the same type ids, so equal bytes mean equal content.
func writeGob[T any](path string, data T) error {
	newBytes, err := encodeGob(data)
	if err != nil {
		return fmt.Errorf("encode %s: %w", path, err)
	}
	if existing, err := os.ReadFile(path); err == nil {
		var old T
		if gob.NewDecoder(bytes.NewReader(existing)).Decode(&old) == nil {
			if oldBytes, err := encodeGob(old); err == nil && bytes.Equal(oldBytes, newBytes) {
				return nil // unchanged content, keep the file as is
			}
		}
	}
	if err := os.WriteFile(path, newBytes, 0o644); err != nil {
		return fmt.Errorf("write %s: %w", path, err)
	}
	return nil
}

func encodeGob(data any) ([]byte, error) {
	var buf bytes.Buffer
	if err := gob.NewEncoder(&buf).Encode(data); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
