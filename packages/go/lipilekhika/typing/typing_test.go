package typing_test

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika"
	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/typing"
	"gopkg.in/yaml.v3"
)

// ── shared types ─────────────────────────────────────────────────────────────

type typingTestCase struct {
	Index         int                    `yaml:"index"`
	Text          string                 `yaml:"text"`
	Output        string                 `yaml:"output"`
	Script        string                 `yaml:"script"`
	PreserveCheck bool                   `yaml:"preserve_check"`
	Options       map[string]interface{} `yaml:"options"`
	Todo          bool                   `yaml:"todo"`
}

type transTestCase struct {
	Index   int             `yaml:"index"`
	From    string          `yaml:"from"`
	To      string          `yaml:"to"`
	Input   string          `yaml:"input"`
	Output  string          `yaml:"output"`
	Todo    bool            `yaml:"todo"`
	Options map[string]bool `yaml:"options"`
}

// ── helpers ───────────────────────────────────────────────────────────────────

func optionsFromMap(m map[string]interface{}) *typing.TypingContextOptions {
	if m == nil {
		return nil
	}
	opts := &typing.TypingContextOptions{}
	if v, ok := m["useNativeNumerals"]; ok {
		if b, ok := v.(bool); ok {
			opts.UseNativeNumerals = ptrBool(b)
		}
	}
	if v, ok := m["includeInherentVowel"]; ok {
		if b, ok := v.(bool); ok {
			opts.IncludeInherentVowel = ptrBool(b)
		}
	}
	if v, ok := m["autoContextClearTimeMs"]; ok {
		switch t := v.(type) {
		case int:
			opts.AutoContextClearTimeMs = ptrInt(t)
		case int64:
			opts.AutoContextClearTimeMs = ptrInt(int(t))
		case float64:
			opts.AutoContextClearTimeMs = ptrInt(int(t))
		}
	}
	return opts
}

func ptrBool(v bool) *bool { return &v }
func ptrInt(v int) *int    { return &v }

func emulateTyping(text, script string, options *typing.TypingContextOptions) (string, error) {
	ctx, err := typing.NewTypingContext(script, options)
	if err != nil {
		return "", err
	}
	result := ""
	for _, ch := range text {
		diff, err := ctx.TakeKeyInput(string(ch))
		if err != nil {
			return "", err
		}
		if diff.ToDeleteCharsCount > 0 {
			rs := []rune(result)
			if diff.ToDeleteCharsCount <= len(rs) {
				result = string(rs[:len(rs)-diff.ToDeleteCharsCount])
			} else {
				result = ""
			}
		}
		result += diff.DiffAddText
	}
	return result, nil
}

// packageRoot walks up from the working directory to find go.mod.
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

func writeTestLog(filename, content string) {
	root, err := packageRoot()
	if err != nil {
		return
	}
	dir := filepath.Join(root, "test_log")
	_ = os.MkdirAll(dir, 0o755)
	_ = os.WriteFile(filepath.Join(dir, filename), []byte(content+"\n"), 0o644)
}

func loadTypingTests(t *testing.T) []typingTestCase {
	t.Helper()
	path := filepath.Join("..", "..", "..", "..", "test_data", "typing", "01-typing-mode.yaml")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read typing test data: %v", err)
	}
	var tests []typingTestCase
	if err := yaml.Unmarshal(data, &tests); err != nil {
		t.Fatalf("parse typing test data: %v", err)
	}
	return tests
}

// loadAutoEmulateTests loads all Normal→Brahmic/Other transliteration cases
// from the auto-nor-brahmic and auto-nor-other folders (same source as JS).
func loadAutoEmulateTests(t *testing.T) []transTestCase {
	t.Helper()
	root, err := packageRoot()
	if err != nil {
		t.Fatalf("find package root: %v", err)
	}
	transRoot := filepath.Join(root, "..", "..", "..", "test_data", "transliteration")
	folders := []string{
		filepath.Join(transRoot, "auto-nor-brahmic"),
		filepath.Join(transRoot, "auto-nor-other"),
	}
	var out []transTestCase
	for _, folder := range folders {
		entries, err := os.ReadDir(folder)
		if err != nil {
			// folder may not exist; skip silently
			continue
		}
		for _, e := range entries {
			if e.IsDir() || filepath.Ext(e.Name()) != ".yaml" {
				continue
			}
			data, err := os.ReadFile(filepath.Join(folder, e.Name()))
			if err != nil {
				t.Fatalf("read %s: %v", e.Name(), err)
			}
			var cases []transTestCase
			if err := yaml.Unmarshal(data, &cases); err != nil {
				t.Fatalf("parse %s: %v", e.Name(), err)
			}
			out = append(out, cases...)
		}
	}
	return out
}

// containsVedicSvara reports whether s contains any Vedic svara character.
// Mirrors the JS skip logic for Tamil-Extended auto-emulate vedic edge cases.
func containsVedicSvara(s string) bool {
	for _, r := range s {
		if r == '॒' || r == '॑' || r == '᳚' || r == '᳛' {
			return true
		}
	}
	return false
}

// ── tests ─────────────────────────────────────────────────────────────────────

func TestTypingMode(t *testing.T) {
	tests := loadTypingTests(t)
	total := 0
	passed := 0
	failed := 0
	todoSkipped := 0
	preserveChecks := 0
	for _, tc := range tests {
		tc := tc
		name := fmt.Sprintf("%d-%s", tc.Index, tc.Script)
		if tc.Todo {
			todoSkipped++
			t.Run(name, func(t *testing.T) { t.Skip("todo") })
			continue
		}
		total++
		ok := t.Run(name, func(t *testing.T) {
			opts := optionsFromMap(tc.Options)
			got, err := emulateTyping(tc.Text, tc.Script, opts)
			if err != nil {
				t.Fatalf("emulate typing: %v", err)
			}
			if got != tc.Output {
				t.Fatalf("typing mismatch: got %q want %q", got, tc.Output)
			}
			if tc.PreserveCheck {
				preserveChecks++
				back, err := lipilekhika.Transliterate(
					got,
					tc.Script,
					"Normal",
					map[string]bool{"all_to_normal:preserve_specific_chars": true},
				)
				if err != nil {
					t.Fatalf("preserve check transliterate: %v", err)
				}
				if back != tc.Text {
					t.Fatalf("preserve check mismatch: got %q want %q", back, tc.Text)
				}
			}
		})
		if ok {
			passed++
		} else {
			failed++
		}
	}
	writeTestLog("typing_mode_log.txt", fmt.Sprintf(
		"Typing Mode: total_emulations=%d, preserve_checks=%d, passed=%d, failed=%d, todo_skipped=%d",
		total, preserveChecks, passed, failed, todoSkipped,
	))
}

func TestAutoEmulateTyping(t *testing.T) {
	cases := loadAutoEmulateTests(t)
	total := 0
	passed := 0
	failed := 0
	skipped := 0 // auto vedic skipped (Tamil-Extended + vedic svara edge case)

	for _, tc := range cases {
		tc := tc
		if tc.From != "Normal" || tc.To == "Normal" {
			continue
		}
		if tc.Todo {
			continue
		}
		total++
		name := fmt.Sprintf("%d-%s", tc.Index, tc.To)
		skippedThisCase := false
		ok := t.Run(name, func(t *testing.T) {
			result, err := emulateTyping(tc.Input, tc.To, nil)
			if err != nil {
				t.Fatalf("emulate typing: %v", err)
			}
			// Mirror JS skip: auto files, Tamil-Extended, result has vedic svara
			if tc.To == "Tamil-Extended" && containsVedicSvara(result) {
				skippedThisCase = true
				t.Skip("auto vedic Tamil-Extended edge case")
				return
			}
			if result != tc.Output {
				t.Errorf("auto emulate mismatch %s→%s index %d:\n  input:    %q\n  expected: %q\n  got:      %q",
					tc.From, tc.To, tc.Index, tc.Input, tc.Output, result)
			}
		})
		if skippedThisCase {
			skipped++
			continue
		}
		if ok {
			passed++
		} else {
			failed++
		}
	}
	writeTestLog("typing_auto_emulate_log.txt", fmt.Sprintf(
		"Emulate Typing (auto transliteration): total_emulations=%d, auto_vedic_skipped=%d, passed=%d, failed=%d",
		total, skipped, passed, failed,
	))
}
