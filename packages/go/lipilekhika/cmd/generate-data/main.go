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

func writeGob(path string, data any) error {
	var buf bytes.Buffer
	enc := gob.NewEncoder(&buf)
	if err := enc.Encode(data); err != nil {
		return fmt.Errorf("encode %s: %w", path, err)
	}
	if err := os.WriteFile(path, buf.Bytes(), 0o644); err != nil {
		return fmt.Errorf("write %s: %w", path, err)
	}
	return nil
}
