package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika"
	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/scriptdata"
	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/typing"
	"gopkg.in/yaml.v3"
)

type transliterationCase struct {
	From    string          `yaml:"from"`
	To      string          `yaml:"to"`
	Input   string          `yaml:"input"`
	Options map[string]bool `yaml:"options"`
	Todo    bool            `yaml:"todo"`
}

type typingCase struct {
	Text    string         `yaml:"text"`
	Script  string         `yaml:"script"`
	Options map[string]any `yaml:"options"`
	Todo    bool           `yaml:"todo"`
}

func main() {
	iterations := flag.Int("iterations", 1, "number of full benchmark iterations")
	flag.Parse()

	if *iterations <= 0 {
		fmt.Fprintln(os.Stderr, "iterations must be > 0")
		os.Exit(1)
	}

	root, err := findRepoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "find repo root: %v\n", err)
		os.Exit(1)
	}

	transCases, err := loadTransliterationCases(filepath.Join(root, "test_data", "transliteration"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "load transliteration cases: %v\n", err)
		os.Exit(1)
	}
	typingCases, err := loadTypingCases(filepath.Join(root, "test_data", "typing"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "load typing cases: %v\n", err)
		os.Exit(1)
	}

	if err := preloadData(); err != nil {
		fmt.Fprintf(os.Stderr, "preload script data: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Benchmark iterations: %d\n", *iterations)
	fmt.Printf("Transliteration cases: %d\n", len(transCases))
	fmt.Printf("Typing cases: %d\n\n", len(typingCases))

	runTransliterationBenchmark(transCases, *iterations)
	runTypingBenchmark(transCases, typingCases, *iterations)
}

func runTransliterationBenchmark(cases []transliterationCase, iterations int) {
	start := time.Now()
	ops := 0
	for i := 0; i < iterations; i++ {
		for _, tc := range cases {
			if _, err := lipilekhika.Transliterate(tc.Input, tc.From, tc.To, tc.Options); err != nil {
				fmt.Fprintf(os.Stderr, "transliteration benchmark failed: from=%s to=%s err=%v\n", tc.From, tc.To, err)
				os.Exit(1)
			}
			ops++
		}
	}
	elapsed := time.Since(start)
	printMetrics("Transliteration Cases", elapsed, ops)
}

func runTypingBenchmark(transCases []transliterationCase, typingCases []typingCase, iterations int) {
	normalToOthers := make([]transliterationCase, 0, len(transCases))
	for _, tc := range transCases {
		if tc.From == "Normal" {
			normalToOthers = append(normalToOthers, tc)
		}
	}

	start := time.Now()
	ops := 0
	for i := 0; i < iterations; i++ {
		for _, tc := range normalToOthers {
			if _, err := emulateTyping(tc.Input, tc.To, nil); err != nil {
				fmt.Fprintf(os.Stderr, "typing benchmark failed: script=%s err=%v\n", tc.To, err)
				os.Exit(1)
			}
			ops++
		}
		for _, tc := range typingCases {
			opts := toTypingOptions(tc.Options)
			if _, err := emulateTyping(tc.Text, tc.Script, opts); err != nil {
				fmt.Fprintf(os.Stderr, "typing benchmark failed: script=%s err=%v\n", tc.Script, err)
				os.Exit(1)
			}
			ops++
		}
	}
	elapsed := time.Since(start)
	printMetrics("Typing Emulation", elapsed, ops)
}

func emulateTyping(text, script string, opts *typing.TypingContextOptions) (string, error) {
	ctx, err := typing.NewTypingContext(script, opts)
	if err != nil {
		return "", err
	}
	result := ""
	for _, r := range text {
		diff, err := ctx.TakeKeyInput(string(r))
		if err != nil {
			return "", err
		}
		if diff.ToDeleteCharsCount > 0 {
			outRunes := []rune(result)
			if diff.ToDeleteCharsCount >= len(outRunes) {
				result = ""
			} else {
				result = string(outRunes[:len(outRunes)-diff.ToDeleteCharsCount])
			}
		}
		result += diff.DiffAddText
	}
	return result, nil
}

func toTypingOptions(m map[string]any) *typing.TypingContextOptions {
	if m == nil {
		return nil
	}
	opts := &typing.TypingContextOptions{}
	set := false

	if v, ok := m["autoContextClearTimeMs"]; ok {
		switch t := v.(type) {
		case int:
			x := t
			opts.AutoContextClearTimeMs = &x
			set = true
		case int64:
			x := int(t)
			opts.AutoContextClearTimeMs = &x
			set = true
		case float64:
			x := int(t)
			opts.AutoContextClearTimeMs = &x
			set = true
		}
	}
	if v, ok := m["useNativeNumerals"].(bool); ok {
		x := v
		opts.UseNativeNumerals = &x
		set = true
	}
	if v, ok := m["includeInherentVowel"].(bool); ok {
		x := v
		opts.IncludeInherentVowel = &x
		set = true
	}
	if !set {
		return nil
	}
	return opts
}

func preloadData() error {
	list, err := scriptdata.GetScriptListData()
	if err != nil {
		return err
	}
	for _, script := range list.Scripts {
		if _, err := scriptdata.GetScriptData(script); err != nil {
			return err
		}
	}
	return nil
}

func findRepoRoot() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for d := wd; d != ""; {
		candidate := filepath.Join(d, "test_data")
		if st, err := os.Stat(candidate); err == nil && st.IsDir() {
			return d, nil
		}
		next := filepath.Dir(d)
		if next == d {
			break
		}
		d = next
	}
	return "", fmt.Errorf("test_data directory not found from %q", wd)
}

func loadTransliterationCases(root string) ([]transliterationCase, error) {
	paths, err := listYAMLFiles(root, false)
	if err != nil {
		return nil, err
	}
	out := make([]transliterationCase, 0)
	for _, p := range paths {
		raw, err := os.ReadFile(p)
		if err != nil {
			return nil, err
		}
		var items []transliterationCase
		if err := yaml.Unmarshal(raw, &items); err != nil {
			return nil, fmt.Errorf("parse %s: %w", p, err)
		}
		for _, item := range items {
			if item.Todo {
				continue
			}
			out = append(out, item)
		}
	}
	return out, nil
}

func loadTypingCases(root string) ([]typingCase, error) {
	paths, err := listYAMLFiles(root, true)
	if err != nil {
		return nil, err
	}
	out := make([]typingCase, 0)
	for _, p := range paths {
		raw, err := os.ReadFile(p)
		if err != nil {
			return nil, err
		}
		var items []typingCase
		if err := yaml.Unmarshal(raw, &items); err != nil {
			return nil, fmt.Errorf("parse %s: %w", p, err)
		}
		for _, item := range items {
			if item.Todo {
				continue
			}
			out = append(out, item)
		}
	}
	return out, nil
}

func listYAMLFiles(root string, skipContext bool) ([]string, error) {
	files := make([]string, 0)
	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			if skipContext && d.Name() == "context" {
				return filepath.SkipDir
			}
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

func printMetrics(label string, elapsed time.Duration, ops int) {
	ms := float64(elapsed) / float64(time.Millisecond)
	perSec := 0.0
	if elapsed > 0 {
		perSec = float64(ops) / elapsed.Seconds()
	}
	fmt.Printf("%s:\n", label)
	fmt.Printf("  Time: %.2f ms\n", ms)
	fmt.Printf("  Operations: %d\n", ops)
	fmt.Printf("  Throughput: %.2f ops/sec\n\n", perSec)
}
