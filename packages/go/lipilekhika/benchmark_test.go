package lipilekhika_test

// Benchmarks over the `test_data` cases, same workloads as the rust criterion bench
// (`packages/rust/src/benches/benchmark.rs`). One op = one full pass over the cases.
//
//	go test -run '^$' -bench . -benchmem -count 10 > new.txt
//	go run golang.org/x/perf/cmd/benchstat@latest old.txt new.txt

import (
	"os"
	"path/filepath"
	"sort"
	"sync"
	"testing"
	"unicode/utf8"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika"
	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/typing"
	"gopkg.in/yaml.v3"
)

type benchTransliterationCase struct {
	From    string          `yaml:"from"`
	To      string          `yaml:"to"`
	Input   string          `yaml:"input"`
	Options map[string]bool `yaml:"options"`
	Todo    bool            `yaml:"todo"`
}

type benchTypingCase struct {
	Text    string `yaml:"text"`
	Script  string `yaml:"script"`
	Todo    bool   `yaml:"todo"`
	Options struct {
		UseNativeNumerals    *bool `yaml:"useNativeNumerals"`
		IncludeInherentVowel *bool `yaml:"includeInherentVowel"`
	} `yaml:"options"`
}

var (
	benchDataOnce   sync.Once
	benchTranslit   []benchTransliterationCase
	benchNormalTo   []benchTransliterationCase
	benchTypingData []benchTypingCase
	benchDataErr    error
)

// benchTestDataRoot walks up from the working directory to the repo's `test_data`.
func benchTestDataRoot() (string, bool) {
	wd, err := os.Getwd()
	if err != nil {
		return "", false
	}
	for d := wd; ; d = filepath.Dir(d) {
		p := filepath.Join(d, "test_data")
		if st, err := os.Stat(p); err == nil && st.IsDir() {
			return p, true
		}
		if filepath.Dir(d) == d {
			return "", false
		}
	}
}

func loadBenchYAML[T any](dir string, skipContext bool) ([]T, error) {
	var files []string
	err := filepath.WalkDir(dir, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() && skipContext && d.Name() == "context" {
			return filepath.SkipDir
		}
		if !d.IsDir() && filepath.Ext(p) == ".yaml" {
			files = append(files, p)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Strings(files)
	var out []T
	for _, f := range files {
		raw, err := os.ReadFile(f)
		if err != nil {
			return nil, err
		}
		var items []T
		if err := yaml.Unmarshal(raw, &items); err != nil {
			return nil, err
		}
		out = append(out, items...)
	}
	return out, nil
}

func benchData(b *testing.B) {
	benchDataOnce.Do(func() {
		root, ok := benchTestDataRoot()
		if !ok {
			return
		}
		translit, err := loadBenchYAML[benchTransliterationCase](filepath.Join(root, "transliteration"), false)
		if err != nil {
			benchDataErr = err
			return
		}
		for _, c := range translit {
			if c.Todo {
				continue
			}
			benchTranslit = append(benchTranslit, c)
			if c.From == "Normal" {
				benchNormalTo = append(benchNormalTo, c)
			}
		}
		typingCases, err := loadBenchYAML[benchTypingCase](filepath.Join(root, "typing"), true)
		if err != nil {
			benchDataErr = err
			return
		}
		for _, c := range typingCases {
			if !c.Todo {
				benchTypingData = append(benchTypingData, c)
			}
		}
	})
	if benchDataErr != nil {
		b.Fatal(benchDataErr)
	}
	if len(benchTranslit) == 0 {
		b.Skip("test_data not found (run `bun run gen:test-data` from the repo root)")
	}
}

func transliterationPass(b *testing.B, cases []benchTransliterationCase) {
	for _, c := range cases {
		if _, err := lipilekhika.Transliterate(c.Input, c.From, c.To, c.Options); err != nil {
			b.Fatal(err)
		}
	}
}

// emulateTyping types `text` key by key, keeping the output like an input field would
// (deleting from the end, so the bookkeeping stays linear).
func emulateTyping(b *testing.B, text, script string, opts *typing.TypingContextOptions) string {
	ctx, err := typing.NewTypingContext(script, opts)
	if err != nil {
		b.Fatal(err)
	}
	out := make([]byte, 0, len(text)*3)
	for _, r := range text {
		diff, err := ctx.TakeKeyInput(string(r))
		if err != nil {
			b.Fatal(err)
		}
		for i := 0; i < diff.ToDeleteCharsCount && len(out) > 0; i++ {
			_, size := utf8.DecodeLastRune(out)
			out = out[:len(out)-size]
		}
		out = append(out, diff.DiffAddText...)
	}
	return string(out)
}

func BenchmarkTransliterationAllCases(b *testing.B) {
	benchData(b)
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		transliterationPass(b, benchTranslit)
	}
}

// BenchmarkTransliterationMulti splits one pass over 10 goroutines (like `bench/benchmark.go`).
func BenchmarkTransliterationMulti(b *testing.B) {
	benchData(b)
	const workers = 10
	chunk := (len(benchTranslit) + workers - 1) / workers
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		var wg sync.WaitGroup
		for start := 0; start < len(benchTranslit); start += chunk {
			end := min(start+chunk, len(benchTranslit))
			wg.Add(1)
			go func(cases []benchTransliterationCase) {
				defer wg.Done()
				for _, c := range cases {
					_, _ = lipilekhika.Transliterate(c.Input, c.From, c.To, c.Options)
				}
			}(benchTranslit[start:end])
		}
		wg.Wait()
	}
}

func BenchmarkTypingNormalToOthers(b *testing.B) {
	benchData(b)
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		for _, c := range benchNormalTo {
			emulateTyping(b, c.Input, c.To, nil)
		}
	}
}

func BenchmarkTypingCases(b *testing.B) {
	benchData(b)
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		for _, c := range benchTypingData {
			opts := &typing.TypingContextOptions{
				UseNativeNumerals:    c.Options.UseNativeNumerals,
				IncludeInherentVowel: c.Options.IncludeInherentVowel,
			}
			emulateTyping(b, c.Text, c.Script, opts)
		}
	}
}
