package lipilekhika

import "strings"

// Ported from:
// - packages/js/src/utils/lang_list/index.ts
// - packages/js/src/utils/lang_list/langs.json
// - packages/js/src/utils/lang_list/script_normalization.ts

var scriptList = []string{
	"Devanagari",
	"Telugu",
	"Tamil",
	"Tamil-Extended",
	"Bengali",
	"Kannada",
	"Gujarati",
	"Malayalam",
	"Odia",
	"Sinhala",
	"Normal",
	"Romanized",
	"Gurumukhi",
	"Assamese",
	"Purna-Devanagari",
	"Brahmi",
	"Granth",
	"Modi",
	"Sharada",
	"Siddham",
}

var langScriptMap = map[string]string{
	"Bengali":   "Bengali",
	"Gujarati":  "Gujarati",
	"Hindi":     "Devanagari",
	"Kannada":   "Kannada",
	"Malayalam": "Malayalam",
	"Odia":      "Odia",
	"Sinhala":   "Sinhala",
	"Tamil":     "Tamil",
	"Telugu":    "Telugu",
	"English":   "Normal",
	"Sanskrit":  "Devanagari",
	"Marathi":   "Devanagari",
	"Nepali":    "Devanagari",
	"Punjabi":   "Gurumukhi",
	"Assamese":  "Assamese",
}

var acronymsMap = map[string]string{
	// Script acronyms
	"dev":    "Devanagari",
	"te":     "Telugu",
	"tel":    "Telugu",
	"tam":    "Tamil",
	"tam-ex": "Tamil-Extended",
	"ben":    "Bengali",
	"be":     "Bengali",
	"ka":     "Kannada",
	"kan":    "Kannada",
	"gu":     "Gujarati",
	"guj":    "Gujarati",
	"mal":    "Malayalam",
	"or":     "Odia",
	"od":     "Odia",
	"oriya":  "Odia",
	"si":     "Sinhala",
	"sinh":   "Sinhala",
	"sin":    "Sinhala",
	"en":     "Normal",
	"rom":    "Romanized",
	"gur":    "Gurumukhi",
	"as":     "Assamese",

	// Language acronyms
	"sa":  "Devanagari",
	"san": "Devanagari",
	"hin": "Devanagari",
	"hi":  "Devanagari",
	"mar": "Devanagari",
	"ne":  "Devanagari",
	"nep": "Devanagari",
	"pun": "Gurumukhi",
}

func capitalizeFirstAndAfterDash(str string) string {
	// mimic: str.toLowerCase().replace(/(^|-)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase())
	s := strings.ToLower(str)
	var b strings.Builder
	b.Grow(len(s))
	capNext := true
	for i := 0; i < len(s); i++ {
		ch := s[i]
		if ch == '-' {
			b.WriteByte('-')
			capNext = true
			continue
		}
		if capNext && ch >= 'a' && ch <= 'z' {
			b.WriteByte(ch - 32)
			capNext = false
			continue
		}
		if capNext {
			capNext = false
		}
		b.WriteByte(ch)
	}
	return b.String()
}

// GetNormalizedScriptName returns the canonical script name (e.g. "Devanagari") or ("", false).
func GetNormalizedScriptName(name string) (string, bool) {
	capitalized := capitalizeFirstAndAfterDash(name)
	for _, s := range scriptList {
		if s == capitalized {
			return s, true
		}
	}
	if mapped, ok := langScriptMap[capitalized]; ok {
		return mapped, true
	}
	if mapped, ok := acronymsMap[strings.ToLower(name)]; ok {
		return mapped, true
	}
	return "", false
}
