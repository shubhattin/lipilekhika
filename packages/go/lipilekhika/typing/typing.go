package typing

import (
	"time"

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
	// Defaults to DefaultAutoContextClearTimeMs.
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
	if opts.AutoContextClearTimeMs != nil && *opts.AutoContextClearTimeMs > 0 {
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

	autoContextClearTime time.Duration
	lastTime             time.Time

	fromScriptData *scriptdata.ScriptData
	toScriptData   *scriptdata.ScriptData
	transOptions   map[string]bool
	customRules    []scriptdata.Rule
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
	resolved := transliterate.ResolveTransliterationRules(&fromData, &toData, customOpts, nil)

	return &TypingContext{
		normalizedTypingLang: normalized,
		useNativeNumerals:    *opts.UseNativeNumerals,
		includeInherentVowel: *opts.IncludeInherentVowel,
		autoContextClearTime: time.Duration(*opts.AutoContextClearTimeMs) * time.Millisecond,
		fromScriptData:       &fromData,
		toScriptData:         &toData,
		transOptions:         resolved.TransOptions,
		customRules:          resolved.CustomRules,
	}, nil
}

// ClearContext clears all internal state and contexts.
func (c *TypingContext) ClearContext() {
	c.lastTime = time.Time{}
	c.currInput = ""
	c.currOutput = ""
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
		return TypingDiff{
			ToDeleteCharsCount: 0,
			DiffAddText:        "",
			ContextLength:      0,
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

	result, err := transliterate.TransliterateTextCore(
		c.currInput,
		"Normal",
		c.normalizedTypingLang,
		c.fromScriptData,
		c.toScriptData,
		c.transOptions,
		c.customRules,
		c.buildTranslitOptions(),
	)
	if err != nil {
		return TypingDiff{}, err
	}

	contextLength := result.ContextLength
	output := result.Output

	if contextLength > 0 {
		c.currOutput = output
	} else if contextLength == 0 {
		c.ClearContext()
	}

	toDeleteCharsCount, diffAddText := computeDiff(prevOutput, output)

	c.lastTime = time.Now()

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
	prevRunes := []rune(prevOutput)
	outRunes := []rune(output)

	common := 0
	for common < len(prevRunes) && common < len(outRunes) {
		if prevRunes[common] != outRunes[common] {
			break
		}
		common++
	}
	toDelete := len(prevRunes) - common
	diffAdd := string(outRunes[common:])
	return toDelete, diffAdd
}
