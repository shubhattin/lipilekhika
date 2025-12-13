package lipilekhika

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"sort"
	"strings"
)

type ruleType string

const (
	ruleTypeReplacePrevKramaKeys ruleType = "replace_prev_krama_keys"
	ruleTypeDirectReplace        ruleType = "direct_replace"
)

type checkInType string

const (
	checkInInput  checkInType = "input"
	checkInOutput checkInType = "output"
)

type customRule struct {
	Type       ruleType    `json:"type"`
	CheckIn    checkInType `json:"check_in"`
	UseReplace bool        `json:"use_replace,omitempty"`

	Prev        []int `json:"prev,omitempty"`
	Following   []int `json:"following,omitempty"`
	ReplaceWith []int `json:"replace_with,omitempty"`

	ToReplace [][]int `json:"to_replace,omitempty"`
}

type customOption struct {
	FromScriptType *string  `json:"from_script_type,omitempty"` // "all" | "brahmic" | "other"
	ToScriptType   *string  `json:"to_script_type,omitempty"`
	FromScriptName []string `json:"from_script_name,omitempty"`
	ToScriptName   []string `json:"to_script_name,omitempty"`

	CheckIn checkInType  `json:"check_in"`
	Rules   []customRule `json:"rules"`
}

type customOptionsMap map[string]customOption

// Small interface to avoid depending on scriptdata directly in option helpers.
type kramaLookup interface {
	KramaTextOrEmpty(idx int) string
}

func loadCustomOptions(fsys fs.FS) (customOptionsMap, error) {
	b, err := fs.ReadFile(fsys, "data/custom_options.json")
	if err != nil {
		return nil, fmt.Errorf("read custom_options.json: %w", err)
	}
	var m customOptionsMap
	if err := json.Unmarshal(b, &m); err != nil {
		return nil, fmt.Errorf("parse custom_options.json: %w", err)
	}
	return m, nil
}

func (m customOptionsMap) keysSorted() []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func containsString(arr []string, x string) bool {
	for _, s := range arr {
		if s == x {
			return true
		}
	}
	return false
}

// getActiveCustomOptions mirrors packages/js/src/transliteration/transliterate.ts:get_active_custom_options
func getActiveCustomOptions(
	all customOptionsMap,
	fromScriptType string,
	fromScriptName string,
	toScriptType string,
	toScriptName string,
	inputOptions map[string]bool,
) map[string]bool {
	if inputOptions == nil {
		return map[string]bool{}
	}

	// deterministic behavior: iterate option keys sorted
	keys := make([]string, 0, len(inputOptions))
	for k := range inputOptions {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	active := map[string]bool{}
	for _, key := range keys {
		enabled := inputOptions[key]
		if !enabled {
			continue
		}
		opt, ok := all[key]
		if !ok {
			continue
		}

		matchesFrom := false
		if opt.FromScriptType != nil {
			if *opt.FromScriptType == "all" || *opt.FromScriptType == fromScriptType {
				matchesFrom = true
			}
		}
		if !matchesFrom && len(opt.FromScriptName) > 0 {
			if containsString(opt.FromScriptName, fromScriptName) {
				matchesFrom = true
			}
		}
		if !matchesFrom {
			continue
		}

		matchesTo := false
		if opt.ToScriptType != nil {
			if *opt.ToScriptType == "all" || *opt.ToScriptType == toScriptType {
				matchesTo = true
			}
		}
		if !matchesTo && len(opt.ToScriptName) > 0 {
			if containsString(opt.ToScriptName, toScriptName) {
				matchesTo = true
			}
		}
		if !matchesTo {
			continue
		}

		active[key] = true
	}
	return active
}

// applyCustomReplaceRules mirrors apply_custom_repalce_rules in JS (including the misspelling).
func applyCustomReplaceRules(text string, script kramaLookup, rules []customRule, allowed checkInType) string {
	if len(rules) == 0 {
		return text
	}
	for _, rule := range rules {
		if !rule.UseReplace || rule.CheckIn != allowed {
			continue
		}
		switch rule.Type {
		case ruleTypeReplacePrevKramaKeys:
			prev := strings.Builder{}
			for _, p := range rule.Prev {
				prev.WriteString(script.KramaTextOrEmpty(p))
			}
			prevStr := prev.String()
			for _, f := range rule.Following {
				follow := script.KramaTextOrEmpty(f)
				if follow == "" {
					continue
				}
				replace := strings.Builder{}
				for _, r := range rule.ReplaceWith {
					replace.WriteString(script.KramaTextOrEmpty(r))
				}
				replace.WriteString(follow)
				text = strings.ReplaceAll(text, prevStr+follow, replace.String())
			}
		case ruleTypeDirectReplace:
			for _, toReplaceArr := range rule.ToReplace {
				var sb strings.Builder
				for _, idx := range toReplaceArr {
					sb.WriteString(script.KramaTextOrEmpty(idx))
				}
				toReplace := sb.String()
				var rb strings.Builder
				for _, idx := range rule.ReplaceWith {
					rb.WriteString(script.KramaTextOrEmpty(idx))
				}
				text = strings.ReplaceAll(text, toReplace, rb.String())
			}
		}
	}
	return text
}
