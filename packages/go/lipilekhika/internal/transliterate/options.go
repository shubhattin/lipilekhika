package transliterate

import (
	"slices"
	"sort"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/scriptdata"
)

const (
	optUseTypingChars        = "normal_to_all:use_typing_chars"
	optPreserveSpecificChars = "all_to_normal:preserve_specific_chars"
	optSinhalaConjunctHalant = "all_to_sinhala:use_conjunct_enabling_halant"
	optIncludeInherentVowel  = "normal_to_brahmic:include_inherent_vowel"
	optKeepASCIINumerals     = "normal_to_brahmic:keep_ascii_numerals"
)

// ResolvedRules holds the resolved transliteration rules.
type ResolvedRules struct {
	TransOptions map[string]bool
	CustomRules  []scriptdata.Rule
}

func getActiveCustomOptions(
	fromData, toData *scriptdata.ScriptData,
	customOptionsMap map[string]scriptdata.CustomOption,
	inputOptions map[string]bool,
) map[string]bool {
	if inputOptions == nil {
		return nil
	}
	active := make(map[string]bool)
	fromName := fromData.ScriptName
	toName := toData.ScriptName
	fromType := fromData.ScriptType
	toType := toData.ScriptType

	for key, enabled := range inputOptions {
		opt, ok := customOptionsMap[key]
		if !ok {
			continue
		}
		fromAll := opt.FromScriptType != nil && *opt.FromScriptType == scriptdata.ScriptTypeAll
		toAll := opt.ToScriptType != nil && *opt.ToScriptType == scriptdata.ScriptTypeAll
		if fromAll && toAll {
			active[key] = enabled
			continue
		}
		fromMatch := (opt.FromScriptType != nil &&
			(*opt.FromScriptType == scriptdata.ScriptTypeAll || *opt.FromScriptType == fromType)) ||
			contains(opt.FromScriptName, fromName)
		if !fromMatch {
			continue
		}
		toMatch := (opt.ToScriptType != nil &&
			(*opt.ToScriptType == scriptdata.ScriptTypeAll || *opt.ToScriptType == toType)) ||
			contains(opt.ToScriptName, toName)
		if toMatch {
			active[key] = enabled
		}
	}
	return active
}

func contains(s []string, v string) bool {
	for _, x := range s {
		if x == v {
			return true
		}
	}
	return false
}

func resolveTransliterationRules(
	fromData, toData *scriptdata.ScriptData,
	customOptionsMap map[string]scriptdata.CustomOption,
	inputOptions map[string]bool,
) ResolvedRules {
	// The overwhelmingly common API call has no custom options. Avoid scanning
	// custom-option data when every option is necessarily disabled.
	if inputOptions == nil {
		return ResolvedRules{TransOptions: map[string]bool{}}
	}
	tOpts := getActiveCustomOptions(fromData, toData, customOptionsMap, inputOptions)
	// Rules are applied in the canonical option order (rule order can change the output
	// when several options are enabled), map iteration order would be random.
	var customRules []scriptdata.Rule
	for _, k := range orderedCustomOptionKeys(tOpts) {
		if opt, ok := customOptionsMap[k]; ok {
			customRules = append(customRules, opt.Rules...)
		}
	}
	return ResolvedRules{TransOptions: tOpts, CustomRules: customRules}
}

// customOptionKeys are the custom option keys in `custom_options.json` order
// (same as rust `CustomOptions::KEYS`; kept in sync by `TestCustomOptionKeysOrder`).
var customOptionKeys = []string{
	"all_to_normal:replace_pancham_varga_varna_with_n",
	"brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra",
	"all_to_sinhala:use_conjunct_enabling_halant",
	"all_to_normal:remove_virAma_and_double_virAma",
	"all_to_normal:replace_avagraha_with_a",
	"normal_to_all:use_typing_chars",
	"all_to_normal:preserve_specific_chars",
	"normal_to_brahmic:include_inherent_vowel",
	"normal_to_brahmic:keep_ascii_numerals",
}

// orderedCustomOptionKeys returns the enabled keys of `opts` in canonical order
// (unknown keys, if any, last in sorted order).
func orderedCustomOptionKeys(opts map[string]bool) []string {
	keys := make([]string, 0, len(opts))
	for _, k := range customOptionKeys {
		if opts[k] {
			keys = append(keys, k)
		}
	}
	var unknown []string
	for k, enabled := range opts {
		if enabled && !slices.Contains(customOptionKeys, k) {
			unknown = append(unknown, k)
		}
	}
	sort.Strings(unknown)
	return append(keys, unknown...)
}

// ResolveTransliterationRules is an exported wrapper around resolveTransliterationRules.
// It enables other packages (like typing) to reuse the same rule resolution logic.
func ResolveTransliterationRules(
	fromData, toData *scriptdata.ScriptData,
	customOptionsMap map[string]scriptdata.CustomOption,
	inputOptions map[string]bool,
) ResolvedRules {
	return resolveTransliterationRules(fromData, toData, customOptionsMap, inputOptions)
}

func transOpt(m map[string]bool, key string) bool {
	v, ok := m[key]
	return ok && v
}

// GetAllOptions returns the custom option keys that have an effect from fromScript to toScript,
// in `custom_options.json` order (port of the rust `get_all_options`).
func GetAllOptions(fromScript, toScript string) ([]string, error) {
	fromNorm, err := scriptdata.GetNormalizedScriptName(fromScript)
	if err != nil {
		return nil, err
	}
	toNorm, err := scriptdata.GetNormalizedScriptName(toScript)
	if err != nil {
		return nil, err
	}
	// the text is returned as it is, no option has an effect (Hindi -> Sanskrit)
	if fromNorm == toNorm {
		return []string{}, nil
	}
	fromData, err := scriptdata.GetScriptData(fromNorm)
	if err != nil {
		return nil, err
	}
	toData, err := scriptdata.GetScriptData(toNorm)
	if err != nil {
		return nil, err
	}
	customOptionsMap, err := scriptdata.GetCustomOptionsMap()
	if err != nil {
		return nil, err
	}
	allEnabled := make(map[string]bool, len(customOptionsMap))
	for key := range customOptionsMap {
		allEnabled[key] = true
	}
	active := getActiveCustomOptions(fromData, toData, customOptionsMap, allEnabled)
	return orderedCustomOptionKeys(active), nil
}
