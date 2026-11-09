package typing

import (
	"strings"
	"time"
	"unicode/utf8"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/scriptdata"
	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/transliterate"
)

// Default time in milliseconds after which the context will be cleared automatically.
const DefaultAutoContextClearTimeMs = 4500

// Default value for using native numerals while typing.
const DefaultUseNativeNumerals = true

// Default value for including inherent vowels while typing.
// By default avoids schwa deletion.
const DefaultIncludeInherentVowel = false

// TypingContextOptions configures a typing context.
type TypingContextOptions struct {
	// The time in milliseconds after which the context will be cleared automatically.
	// 0 clears it after any pause. Defaults to DefaultAutoContextClearTimeMs (when nil).
	AutoContextClearTimeMs *int
	// Use native numerals in transliteration/typing. Defaults to DefaultUseNativeNumerals.
	UseNativeNumerals *bool
	// Include inherent vowels (schwa character) in transliteration/typing.
	//
	// true:  k -> क  (Eg. Hindi, Bengali, Gujarati, etc.)
	// false: k -> क् (Default behavior in transliteration. Eg. Sanskrit, Telugu, Tamil, Kannada, etc.)
	//
	// Defaults to DefaultIncludeInherentVowel.
	IncludeInherentVowel *bool
}

func withDefaults(opts *TypingContextOptions) TypingContextOptions {
	out := TypingContextOptions{
		AutoContextClearTimeMs: intPtr(DefaultAutoContextClearTimeMs),
		UseNativeNumerals:      boolPtr(DefaultUseNativeNumerals),
		IncludeInherentVowel:   boolPtr(DefaultIncludeInherentVowel),
	}
	if opts == nil {
		return out
	}
	if opts.AutoContextClearTimeMs != nil {
		out.AutoContextClearTimeMs = intPtr(*opts.AutoContextClearTimeMs)
	}
	if opts.UseNativeNumerals != nil {
		out.UseNativeNumerals = boolPtr(*opts.UseNativeNumerals)
	}
	if opts.IncludeInherentVowel != nil {
		out.IncludeInherentVowel = boolPtr(*opts.IncludeInherentVowel)
	}
	return out
}

func boolPtr(v bool) *bool {
	return &v
}

func intPtr(v int) *int {
	return &v
}

// TypingDiff is the result of processing a single key input.
type TypingDiff struct {
	// Number of characters that should be deleted from the current "app" input state.
	ToDeleteCharsCount int
	// Text that should be inserted into the current "app" input state.
	DiffAddText string
	// Can be used to determine if the context should be cleared.
	ContextLength int
}

// TypingContext is a stateful isolated context for character-by-character input typing.
// It is synchronous and uses the Go script data cache.
type TypingContext struct {
	normalizedTypingLang string

	useNativeNumerals    bool
	includeInherentVowel bool

	currInput  string
	currOutput string
	// context length returned for the last key (0 after a clear)
	currContextLength int
	// currInput length (bytes) at which commitContextStart is tried next
	nextTrimLength int

	autoContextClearTime time.Duration
	lastTime             time.Time

	fromScriptData *scriptdata.ScriptData
	toScriptData   *scriptdata.ScriptData
	transOptions   map[string]bool
	customRules    []scriptdata.Rule

	// Buffers reused across keys (typing re-transliterates the context on every key).
	scratch transliterate.TransliterateScratch
}

// NewTypingContext creates a new typing context for the given script/language.
//
// typingLang can be a script or language name/alias (normalized via GetNormalizedScriptName).
// options configures timing and inherent vowel / numeral behavior.
func NewTypingContext(typingLang string, options *TypingContextOptions) (*TypingContext, error) {
	opts := withDefaults(options)

	normalized, err := scriptdata.GetNormalizedScriptName(typingLang)
	if err != nil {
		return nil, err
	}

	fromData, err := scriptdata.GetScriptData("Normal")
	if err != nil {
		return nil, err
	}
	toData, err := scriptdata.GetScriptData(normalized)
	if err != nil {
		return nil, err
	}
	customOpts, err := scriptdata.GetCustomOptionsMap()
	if err != nil {
		return nil, err
	}
	resolved := transliterate.ResolveTransliterationRules(fromData, toData, customOpts, nil)

	return &TypingContext{
		normalizedTypingLang: normalized,
		useNativeNumerals:    *opts.UseNativeNumerals,
		includeInherentVowel: *opts.IncludeInherentVowel,
		autoContextClearTime: time.Duration(*opts.AutoContextClearTimeMs) * time.Millisecond,
		nextTrimLength:       contextTrimLength,
		fromScriptData:       fromData,
		toScriptData:         toData,
		transOptions:         resolved.TransOptions,
		customRules:          resolved.CustomRules,
	}, nil
}

// ClearContext clears all internal state and contexts.
func (c *TypingContext) ClearContext() {
	c.lastTime = time.Time{}
	c.currInput = ""
	c.currOutput = ""
	c.currContextLength = 0
	c.nextTrimLength = contextTrimLength
}

// Typing keeps the input of the current context and transliterates all of it on every key. The
// context is cleared at a space or punctuation, but a long run of letters would keep growing.
// Once the context input is contextTrimLength long (bytes), its start is committed, keeping
// about the last contextKeepLength (see commitContextStart).
const (
	contextTrimLength = 64
	contextKeepLength = 32
	// number of split points tried for one commit
	contextTrimTries = 4
)

func (c *TypingContext) transliterateInput(input string) (transliterate.TransliterateOutput, error) {
	return transliterate.TransliterateTextCoreWith(
		input,
		"Normal",
		c.normalizedTypingLang,
		c.fromScriptData,
		c.toScriptData,
		c.transOptions,
		c.customRules,
		c.buildTranslitOptions(),
		&c.scratch,
	)
}

// commitContextStart commits the start of a long context, so that a long run of letters does
// not make each key slower (quadratic time). The input is split into a head and about the last
// contextKeepLength of it, the split is only used when it does not change anything: the head
// and the tail transliterated on their own give the current output, and the tail keeps the
// whole context. The head's output is then final, the context continues with the tail.
func (c *TypingContext) commitContextStart() {
	split := len(c.currInput) - contextKeepLength
	for tries := 0; tries < contextTrimTries && split > 0; split-- {
		// split at a rune start
		if !utf8.RuneStart(c.currInput[split]) {
			continue
		}
		tries++
		tailInput := c.currInput[split:]
		tail, err := c.transliterateInput(tailInput)
		if err != nil || tail.Output == "" || tail.ContextLength != c.currContextLength ||
			!strings.HasSuffix(c.currOutput, tail.Output) {
			continue
		}
		head, err := c.transliterateInput(c.currInput[:split])
		if err != nil || len(head.Output)+len(tail.Output) != len(c.currOutput) ||
			!strings.HasPrefix(c.currOutput, head.Output) {
			continue
		}
		c.currInput = tailInput
		c.currOutput = tail.Output
		c.nextTrimLength = contextTrimLength
		return
	}
	// no split point found, try again after some more keys
	c.nextTrimLength = len(c.currInput) + contextKeepLength
}

func (c *TypingContext) buildTranslitOptions() *transliterate.Options {
	return &transliterate.Options{
		TypingMode:           true,
		UseNativeNumerals:    c.useNativeNumerals,
		IncludeInherentVowel: c.includeInherentVowel,
	}
}

// TakeKeyInput accepts character-by-character input and returns the diff relative to the previous output.
func (c *TypingContext) TakeKeyInput(key string) (TypingDiff, error) {
	if key == "" {
		// an empty key changes nothing (not even the idle timer)
		return TypingDiff{
			ToDeleteCharsCount: 0,
			DiffAddText:        "",
			ContextLength:      c.currContextLength,
		}, nil
	}
	var ch rune
	for _, r := range key {
		ch = r
		break
	}
	now := time.Now()
	if !c.lastTime.IsZero() && now.Sub(c.lastTime) > c.autoContextClearTime {
		c.ClearContext()
	}
	c.currInput += string(ch)
	prevOutput := c.currOutput

	result, err := c.transliterateInput(c.currInput)
	if err != nil {
		return TypingDiff{}, err
	}

	contextLength := result.ContextLength
	output := result.Output

	toDeleteCharsCount, diffAddText := computeDiff(prevOutput, output)

	if contextLength > 0 {
		c.currOutput = output
		c.currContextLength = contextLength
		if len(c.currInput) >= c.nextTrimLength {
			c.commitContextStart()
		}
	} else {
		c.ClearContext()
	}

	c.lastTime = now

	return TypingDiff{
		ToDeleteCharsCount: toDeleteCharsCount,
		DiffAddText:        diffAddText,
		ContextLength:      contextLength,
	}, nil
}

// UpdateUseNativeNumerals updates whether native numerals should be used for subsequent typing.
func (c *TypingContext) UpdateUseNativeNumerals(useNativeNumerals bool) {
	c.useNativeNumerals = useNativeNumerals
}

// UpdateIncludeInherentVowel updates whether inherent vowels should be included for subsequent typing.
func (c *TypingContext) UpdateIncludeInherentVowel(includeInherentVowel bool) {
	c.includeInherentVowel = includeInherentVowel
}

// GetUseNativeNumerals returns whether native numerals are used for typing.
func (c *TypingContext) GetUseNativeNumerals() bool {
	return c.useNativeNumerals
}

// GetIncludeInherentVowel returns whether inherent vowels are included for typing.
func (c *TypingContext) GetIncludeInherentVowel() bool {
	return c.includeInherentVowel
}

// GetNormalizedScript returns the normalized script name.
func (c *TypingContext) GetNormalizedScript() string {
	return c.normalizedTypingLang
}

// computeDiff returns (toDeleteCharsCount, diffAddText) between previous and current output.
func computeDiff(prevOutput, output string) (int, string) {
	// common prefix length in bytes, compared rune by rune (no allocation)
	common := 0
	for common < len(prevOutput) && common < len(output) {
		a, sizeA := utf8.DecodeRuneInString(prevOutput[common:])
		b, sizeB := utf8.DecodeRuneInString(output[common:])
		if a != b || sizeA != sizeB {
			break
		}
		common += sizeA
	}
	toDelete := utf8.RuneCountInString(prevOutput[common:])
	return toDelete, output[common:]
}
