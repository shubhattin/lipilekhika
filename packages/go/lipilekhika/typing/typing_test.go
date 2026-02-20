package typing_test

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika"
	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/typing"
	"gopkg.in/yaml.v3"
)

type typingTestCase struct {
	Index         int                    `yaml:"index"`
	Text          string                 `yaml:"text"`
	Output        string                 `yaml:"output"`
	Script        string                 `yaml:"script"`
	PreserveCheck bool                   `yaml:"preserve_check"`
	Options       map[string]interface{} `yaml:"options"`
	Todo          bool                   `yaml:"todo"`
}

var logMu sync.Mutex

func appendTestLog(format string, args ...interface{}) {
	logMu.Lock()
	defer logMu.Unlock()

	dir := filepath.Join("test_log")
	_ = os.MkdirAll(dir, 0o755)
	path := filepath.Join(dir, "typing.log")
	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return
	}
	defer f.Close()
	_, _ = fmt.Fprintf(f, format+"\n", args...)
}

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

func TestTypingMode(t *testing.T) {
	tests := loadTypingTests(t)
	total := 0
	passed := 0
	failed := 0
	for _, tc := range tests {
		tc := tc
		name := fmt.Sprintf("%d-%s", tc.Index, tc.Script)
		if tc.Todo {
			t.Run(name, func(t *testing.T) {})
			continue
		}
		total++
		ok := t.Run(name, func(t *testing.T) {
			opts := optionsFromMap(tc.Options)
			got, err := emulateTyping(tc.Text, tc.Script, opts)
			if err != nil {
				t.Fatalf("emulate typing: %v", err)
			}
			appendTestLog(
				"INFO typing::tests %s input=%q output=%q expected=%q",
				name, tc.Text, got, tc.Output,
			)
			if got != tc.Output {
				t.Fatalf("typing mismatch: got %q want %q", got, tc.Output)
			}
			if tc.PreserveCheck {
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
	appendTestLog(
		"SUMMARY typing::tests total=%d passed=%d failed=%d",
		total, passed, failed,
	)
}
