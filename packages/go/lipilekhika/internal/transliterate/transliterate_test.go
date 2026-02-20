package transliterate

import (
	"os"
	"path/filepath"
	"testing"

	"gopkg.in/yaml.v3"
)

type testCase struct {
	Index      int             `yaml:"index"`
	From       string          `yaml:"from"`
	To         string          `yaml:"to"`
	Input      string          `yaml:"input"`
	Output     string          `yaml:"output"`
	Reversible bool            `yaml:"reversible"`
	Todo       bool            `yaml:"todo"`
	Options    map[string]bool `yaml:"options"`
}

func listYamlFiles(dir string) ([]string, error) {
	var files []string
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && filepath.Ext(path) == ".yaml" {
			files = append(files, path)
		}
		return nil
	})
	return files, err
}

func testDataRoot(t *testing.T) string {
	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	// From internal/transliterate or packages/go/lipilekhika, walk up to find test_data
	for d := wd; d != "" && d != "/"; d = filepath.Dir(d) {
		p := filepath.Join(d, "test_data", "transliteration")
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	t.Skip("test_data/transliteration not found (run bun run gen:test-data and ensure test_data exists)")
	return ""
}

func TestTransliterationYAMLSmoke(t *testing.T) {
	root := testDataRoot(t)
	if root == "" {
		return
	}
	files, err := listYamlFiles(root)
	if err != nil {
		t.Fatalf("list yaml files: %v", err)
	}
	for _, fp := range files {
		fp := fp
		rel, _ := filepath.Rel(root, fp)
		t.Run(rel, func(t *testing.T) {
			data, err := os.ReadFile(fp)
			if err != nil {
				t.Fatalf("read file: %v", err)
			}
			var cases []testCase
			if err := yaml.Unmarshal(data, &cases); err != nil {
				t.Fatalf("parse yaml: %v", err)
			}
			for _, c := range cases {
				if c.Todo {
					continue
				}
				result, err := Transliterate(c.Input, c.From, c.To, c.Options)
				if err != nil {
					t.Errorf("index %d %s→%s: %v", c.Index, c.From, c.To, err)
					continue
				}
				if c.Input != "" && result == "" {
					t.Errorf("index %d %s→%s: got empty output for non-empty input",
						c.Index, c.From, c.To)
				}
				if c.Reversible {
					reversed, err := Transliterate(result, c.To, c.From, c.Options)
					if err != nil {
						t.Errorf("index %d reverse %s←%s: %v", c.Index, c.From, c.To, err)
						continue
					}
					if c.Input != "" && reversed == "" {
						t.Errorf("index %d reverse %s←%s: got empty reverse output for non-empty input",
							c.Index, c.From, c.To)
					}
				}
			}
		})
	}
}

func TestTransliterateBasicPublicBehavior(t *testing.T) {
	out, err := Transliterate("paramAtmanE", "Normal", "Devanagari", nil)
	if err != nil {
		t.Fatalf("transliterate failed: %v", err)
	}
	if out == "" {
		t.Fatalf("expected non-empty transliteration result")
	}

	same, err := Transliterate("नमः", "Devanagari", "Devanagari", nil)
	if err != nil {
		t.Fatalf("same-script transliterate failed: %v", err)
	}
	if same != "नमः" {
		t.Fatalf("same-script transliterate changed text: got %q", same)
	}
}
