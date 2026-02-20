package scriptdata

import (
	"fmt"
	"strings"
)

func GetNormalizedScriptName(input string) (string, error) {
	data, err := GetScriptListData()
	if err != nil {
		return "", err
	}

	candidate := capitalizeFirstAndAfterDash(input)
	for _, script := range data.Scripts {
		if script == candidate {
			return candidate, nil
		}
	}

	for _, lang := range data.Langs {
		if lang == candidate {
			target, ok := data.LangScriptMap[candidate]
			if !ok {
				break
			}
			return target, nil
		}
	}

	lower := strings.ToLower(input)
	if aliasTarget, ok := data.ScriptAlternatesMap[lower]; ok {
		return aliasTarget, nil
	}
	return "", fmt.Errorf("invalid script/lang name: %q", input)
}

func capitalizeFirstAndAfterDash(input string) string {
	var b strings.Builder
	b.Grow(len(input))
	capitalizeNext := true
	for _, ch := range input {
		if ch == '-' {
			capitalizeNext = true
			b.WriteRune(ch)
			continue
		}
		if capitalizeNext && ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
			if ch >= 'a' && ch <= 'z' {
				b.WriteRune(ch - 32)
			} else {
				b.WriteRune(ch)
			}
			capitalizeNext = false
			continue
		}
		if ch >= 'A' && ch <= 'Z' {
			b.WriteRune(ch + 32)
		} else {
			b.WriteRune(ch)
		}
		capitalizeNext = false
	}
	return b.String()
}
