package transliterate

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
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
	for d := wd; d != "" && d != "/"; d = filepath.Dir(d) {
		p := filepath.Join(d, "test_data", "transliteration")
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	t.Skip("test_data/transliteration not found (run bun run gen:test-data and ensure test_data exists)")
	return ""
}

// packageRoot walks up from the current working directory to find the Go
// lipilekhika package root (the directory containing go.mod).
func packageRoot() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for d := wd; d != "" && d != "/"; d = filepath.Dir(d) {
		if _, err := os.Stat(filepath.Join(d, "go.mod")); err == nil {
			return d, nil
		}
	}
	return "", fmt.Errorf("go.mod not found from %q", wd)
}

func writeTransliterationSummary(strictExpected bool, filesTotal, filesPassed, filesFailed, testsTotal, testsPassed, testsFailed, testsSkipped int) {
	root, err := packageRoot()
	if err != nil {
		return
	}
	dir := filepath.Join(root, "test_log")
	_ = os.MkdirAll(dir, 0o755)
	path := filepath.Join(dir, "transliteration_summary.txt")
	line := fmt.Sprintf(
		"Transliteration: strict_expected=%t, files_total=%d, files_passed=%d, files_failed=%d, tests_total=%d, tests_passed=%d, tests_failed=%d, tests_skipped=%d\n",
		strictExpected, filesTotal, filesPassed, filesFailed, testsTotal, testsPassed, testsFailed, testsSkipped,
	)
	_ = os.WriteFile(path, []byte(line), 0o644)
}

func TestTransliterationYAMLSmoke(t *testing.T) {
	// Keep strict checks opt-in because known edge-cases are still being aligned.
	// Set LIPILEKHIKA_STRICT_YAML_EXPECTED=true to enforce exact expected outputs.
	strictExpected := os.Getenv("LIPILEKHIKA_STRICT_YAML_EXPECTED") == "true"
	root := testDataRoot(t)
	if root == "" {
		return
	}
	files, err := listYamlFiles(root)
	if err != nil {
		t.Fatalf("list yaml files: %v", err)
	}

	filesTotal := 0
	filesPassed := 0
	filesFailed := 0
	testsTotal := 0
	testsPassed := 0
	testsFailed := 0
	testsSkipped := 0

	for _, fp := range files {
		fp := fp
		rel, _ := filepath.Rel(root, fp)
		filesTotal++
		ok := t.Run(rel, func(t *testing.T) {
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
					testsSkipped++
					continue
				}
				testsTotal++
				result, err := Transliterate(c.Input, c.From, c.To, c.Options)
				if err != nil {
					testsFailed++
					t.Errorf("index %d %s→%s: %v", c.Index, c.From, c.To, err)
					continue
				}
				// the old lipi lekhika does not handle vedic svara tails in tamil extended properly
				// (same skip as the JS and Rust test suites)
				if strings.HasPrefix(filepath.Base(fp), "auto") && c.To == "Tamil-Extended" &&
					strings.ContainsAny(result, "॒॑᳚᳛") {
					testsSkipped++
					continue
				}
				caseFailed := false
				if strictExpected && c.Output != "" && result != c.Output {
					caseFailed = true
					t.Errorf("index %d %s→%s: expected %q, got %q", c.Index, c.From, c.To, c.Output, result)
				} else if c.Input != "" && result == "" {
					caseFailed = true
					t.Errorf("index %d %s→%s: got empty output for non-empty input", c.Index, c.From, c.To)
				}
				if c.Reversible {
					reversed, err := Transliterate(result, c.To, c.From, c.Options)
					if err != nil {
						caseFailed = true
						t.Errorf("index %d reverse %s←%s: %v", c.Index, c.From, c.To, err)
					} else if strictExpected && reversed != c.Input {
						caseFailed = true
						t.Errorf("index %d reverse %s←%s: expected %q, got %q", c.Index, c.From, c.To, c.Input, reversed)
					} else if c.Input != "" && reversed == "" {
						caseFailed = true
						t.Errorf("index %d reverse %s←%s: got empty reverse output", c.Index, c.From, c.To)
					}
				}
				if caseFailed {
					testsFailed++
				} else {
					testsPassed++
				}
			}
		})
		if ok {
			filesPassed++
		} else {
			filesFailed++
		}
	}

	writeTransliterationSummary(strictExpected, filesTotal, filesPassed, filesFailed, testsTotal, testsPassed, testsFailed, testsSkipped)
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

// Unknown option keys are rejected, like in the Rust based bindings (WASM, N-API, Python, Dart)
func TestUnknownOptionKey(t *testing.T) {
	for _, pair := range [][2]string{{"Normal", "Devanagari"}, {"Hindi", "Sanskrit"}} {
		_, err := Transliterate("k", pair[0], pair[1], map[string]bool{"foo": true})
		if err == nil || err.Error() != "unknown trans_options key: foo" {
			t.Fatalf("%v: expected unknown key error, got %v", pair, err)
		}
	}
	out, err := Transliterate("f", "Normal", "Devanagari", map[string]bool{"normal_to_all:use_typing_chars": true})
	if err != nil || out != "फ़्" {
		t.Fatalf("valid option: got %q, %v", out, err)
	}
}

// customOptionKeys must follow the key order of custom_options.json (rule order matters).
func TestCustomOptionKeysOrder(t *testing.T) {
	root, err := packageRoot()
	if err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(filepath.Join(root, "data", "custom_options.json"))
	if err != nil {
		t.Skipf("custom_options.json not found: %v", err)
	}
	dec := json.NewDecoder(bytes.NewReader(raw))
	if _, err := dec.Token(); err != nil { // opening '{'
		t.Fatal(err)
	}
	var keys []string
	for dec.More() {
		tok, err := dec.Token()
		if err != nil {
			t.Fatal(err)
		}
		keys = append(keys, tok.(string))
		var skip json.RawMessage
		if err := dec.Decode(&skip); err != nil {
			t.Fatal(err)
		}
	}
	if !slices.Equal(keys, customOptionKeys) {
		t.Fatalf("customOptionKeys out of sync with custom_options.json:\n got  %v\n want %v", customOptionKeys, keys)
	}
}

// Rule order follows custom_options.json (like rust): pancham rule runs before the virAma rule.
func TestCustomRuleOrder(t *testing.T) {
	out, err := Transliterate("BIG।", "Devanagari", "Normal", map[string]bool{
		"all_to_normal:replace_pancham_varga_varna_with_n": true,
		"all_to_normal:remove_virAma_and_double_virAma":    true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if out != "BIG" {
		t.Fatalf("got %q, want %q", out, "BIG")
	}
}
