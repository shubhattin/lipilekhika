package lipilekhika

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

type testCase struct {
	Index      float64         `yaml:"index"`
	From       string          `yaml:"from"`
	To         string          `yaml:"to"`
	Input      string          `yaml:"input"`
	Output     string          `yaml:"output"`
	Reversible *bool           `yaml:"reversible,omitempty"`
	Todo       *bool           `yaml:"todo,omitempty"`
	Options    map[string]bool `yaml:"options,omitempty"`
}

func listYamlFiles(dir string) ([]string, error) {
	var files []string
	err := filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if strings.HasSuffix(d.Name(), ".yaml") {
			files = append(files, path)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Strings(files)
	return files, nil
}

func TestTransliterationFixtures(t *testing.T) {
	testDataFolder := filepath.Clean(filepath.Join("..", "..", "test_data", "transliteration"))
	yamlFiles, err := listYamlFiles(testDataFolder)
	if err != nil {
		t.Fatalf("list yaml files: %v", err)
	}

	for _, filePath := range yamlFiles {
		rel, _ := filepath.Rel(testDataFolder, filePath)
		t.Run(rel, func(t *testing.T) {
			b, err := os.ReadFile(filePath)
			if err != nil {
				t.Fatalf("read %s: %v", filePath, err)
			}
			var cases []testCase
			if err := yaml.Unmarshal(b, &cases); err != nil {
				t.Fatalf("parse %s: %v", filePath, err)
			}

			for _, tc := range cases {
				_ = PreloadScriptData(tc.From)
				_ = PreloadScriptData(tc.To)

				got, err := Transliterate(tc.Input, tc.From, tc.To, tc.Options)
				if err != nil {
					t.Fatalf("transliterate (%v %s→%s) err: %v", tc.Index, tc.From, tc.To, err)
				}

				if tc.Todo == nil || !*tc.Todo {
					if got != tc.Output {
						t.Fatalf(
							"Transliteration failed:\n  index: %v\n  from: %s\n  to: %s\n  input: %q\n  expected: %q\n  actual: %q",
							tc.Index, tc.From, tc.To, tc.Input, tc.Output, got,
						)
					}
				}

				if tc.Reversible != nil && *tc.Reversible {
					gotRev, err := Transliterate(got, tc.To, tc.From, tc.Options)
					if err != nil {
						t.Fatalf("reverse transliterate (%v %s←%s) err: %v", tc.Index, tc.To, tc.From, err)
					}
					if tc.Todo == nil || !*tc.Todo {
						if gotRev != tc.Input {
							t.Fatalf(
								"Reversed Transliteration failed:\n  index: %v\n  from: %s\n  to: %s\n  input: %q\n  reversed_input: %q\n  reversed_output: %q",
								tc.Index, tc.To, tc.From, got, tc.Input, gotRev,
							)
						}
					}
				}

				// Keep per-case output short but unique when debugging
				_ = fmt.Sprintf("%v", tc.Index)
			}
		})
	}
}
