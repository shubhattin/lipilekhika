package transliterate

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
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

var transliterationLogMu sync.Mutex

func appendTransliterationTestLog(format string, args ...interface{}) {
	transliterationLogMu.Lock()
	defer transliterationLogMu.Unlock()

	dir := filepath.Join("test_log")
	_ = os.MkdirAll(dir, 0o755)
	path := filepath.Join(dir, "transliteration.log")
	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return
	}
	defer f.Close()
	_, _ = fmt.Fprintf(f, format+"\n", args...)
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
	strictExpected := strings.EqualFold(os.Getenv("LIPILEKHIKA_STRICT_YAML_EXPECTED"), "true")
	root := testDataRoot(t)
	if root == "" {
		return
	}
	files, err := listYamlFiles(root)
	if err != nil {
		t.Fatalf("list yaml files: %v", err)
	}
	totalFiles := 0
	passedFiles := 0
	failedFiles := 0
	for _, fp := range files {
		fp := fp
		rel, _ := filepath.Rel(root, fp)
		totalFiles++
		ok := t.Run(rel, func(t *testing.T) {
			data, err := os.ReadFile(fp)
			if err != nil {
				t.Fatalf("read file: %v", err)
			}
			var cases []testCase
			if err := yaml.Unmarshal(data, &cases); err != nil {
				t.Fatalf("parse yaml: %v", err)
			}
			totalCases := 0
			forwardFailures := 0
			reverseFailures := 0
			for _, c := range cases {
				if c.Todo {
					continue
				}
				totalCases++
				result, err := Transliterate(c.Input, c.From, c.To, c.Options)
				if err != nil {
					forwardFailures++
					appendTransliterationTestLog(
						"ERROR transliteration::tests index=%d from=%s to=%s input=%q err=%v",
						c.Index, c.From, c.To, c.Input, err,
					)
					t.Errorf("index %d %s→%s: %v", c.Index, c.From, c.To, err)
					continue
				}
				appendTransliterationTestLog(
					"INFO transliteration::tests index=%d from=%s to=%s input=%q output=%q",
					c.Index, c.From, c.To, c.Input, result,
				)
				if strictExpected && c.Output != "" && result != c.Output {
					forwardFailures++
					t.Errorf("index %d %s→%s: expected %q, got %q",
						c.Index, c.From, c.To, c.Output, result)
				} else if c.Input != "" && result == "" {
					forwardFailures++
					t.Errorf("index %d %s→%s: got empty output for non-empty input",
						c.Index, c.From, c.To)
				}
				if c.Reversible {
					reversed, err := Transliterate(result, c.To, c.From, c.Options)
					if err != nil {
						reverseFailures++
						appendTransliterationTestLog(
							"ERROR transliteration::tests reverse index=%d from=%s to=%s input=%q err=%v",
							c.Index, c.From, c.To, result, err,
						)
						t.Errorf("index %d reverse %s←%s: %v", c.Index, c.From, c.To, err)
						continue
					}
					appendTransliterationTestLog(
						"INFO transliteration::tests reverse index=%d from=%s to=%s output=%q reversed=%q",
						c.Index, c.From, c.To, result, reversed,
					)
					if strictExpected && reversed != c.Input {
						reverseFailures++
						t.Errorf("index %d reverse %s←%s: expected %q, got %q",
							c.Index, c.From, c.To, c.Input, reversed)
					} else if c.Input != "" && reversed == "" {
						reverseFailures++
						t.Errorf("index %d reverse %s←%s: got empty reverse output for non-empty input",
							c.Index, c.From, c.To)
					}
				}
			}
			appendTransliterationTestLog(
				"SUMMARY transliteration::tests file=%q total_cases=%d forward_failures=%d reverse_failures=%d",
				rel, totalCases, forwardFailures, reverseFailures,
			)
		})
		if ok {
			passedFiles++
		} else {
			failedFiles++
		}
	}
	appendTransliterationTestLog(
		"SUMMARY transliteration::tests files_total=%d files_passed=%d files_failed=%d",
		totalFiles, passedFiles, failedFiles,
	)
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
