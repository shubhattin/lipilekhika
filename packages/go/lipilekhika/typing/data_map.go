package typing

import (
	"strings"
	"unicode/utf8"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/scriptdata"
)

// ListType is the type of a character of a script.
type ListType string

const (
	// ListTypeAnya is any other character: signs (anusvAra, visarga, ...), digits, punctuation.
	ListTypeAnya ListType = "anya"
	// ListTypeVyanjana is a consonant.
	ListTypeVyanjana ListType = "vyanjana"
	// ListTypeMatra is a vowel sign (mAtrA).
	ListTypeMatra ListType = "matra"
	// ListTypeSvara is an independent vowel.
	ListTypeSvara ListType = "svara"
)

// TypingDataMapItem is a character of a script with the keys that type it.
type TypingDataMapItem struct {
	// Text is the character (or characters) the keys type.
	Text string
	// Type is the type of the character.
	Type ListType
	// Mappings are the keys (typed in Normal) that type Text.
	Mappings []string
}

// ScriptTypingDataMap is the typing data of a script, see [GetScriptTypingDataMap].
type ScriptTypingDataMap struct {
	// CommonKramaMap are the characters common to the scripts (from the krama of the script).
	CommonKramaMap []TypingDataMapItem
	// ScriptSpecificKramaMap are the characters specific to the script.
	// A key that types a common character is listed in CommonKramaMap.
	ScriptSpecificKramaMap []TypingDataMapItem
}

// KramaDataItem is a character of a script's krama with its type, see [GetScriptKramaData].
type KramaDataItem struct {
	Text string
	Type ListType
}

func listTypeOf(data *scriptdata.ScriptData, listRef *int16) ListType {
	if listRef == nil || *listRef < 0 || int(*listRef) >= len(data.List) {
		return ListTypeAnya
	}
	switch data.List[*listRef].Kind() {
	case scriptdata.ListKindVyanjana:
		return ListTypeVyanjana
	case scriptdata.ListKindMatra:
		return ListTypeMatra
	case scriptdata.ListKindSvara:
		return ListTypeSvara
	}
	return ListTypeAnya
}

// GetScriptKramaData returns the krama of a script: its characters with their types.
//
// The krama of every script has the same length, and the characters at the same index
// correspond to each other, so the krama of two scripts can be compared side by side.
// script can be a script or language name (e.g. "Devanagari", "Hindi", "tel").
func GetScriptKramaData(script string) ([]KramaDataItem, error) {
	data, err := scriptdata.GetScriptData(script)
	if err != nil {
		return nil, err
	}
	out := make([]KramaDataItem, len(data.KramaTextArr))
	for i, item := range data.KramaTextArr {
		out[i] = KramaDataItem{Text: item.Text, Type: listTypeOf(data, item.ListArrRef)}
	}
	return out, nil
}

// GetScriptInputTexts returns every text a script reads when converting from it, sorted by
// text: the main text of each character and its other spellings (`R^i` beside `RRi` in ITRANS,
// `x` for क्ष). The texts which are only a step towards a longer one are included too (`O` of
// ITRANS, on the way to `OM`), so to get the other spellings of a text keep the ones which
// convert to the same text as it.
//
// script can be a script or language name (e.g. "Devanagari", "Hindi", "tel").
func GetScriptInputTexts(script string) ([]string, error) {
	data, err := scriptdata.GetScriptData(script)
	if err != nil {
		return nil, err
	}
	out := make([]string, 0, len(data.TextToKramaMapArr))
	for _, entry := range data.TextToKramaMapArr {
		if entry.Text == "" || len(entry.Value.Krama) == 0 {
			continue
		}
		valid := true
		for _, k := range entry.Value.Krama {
			if k < 0 {
				valid = false
				break
			}
		}
		if valid {
			out = append(out, entry.Text)
		}
	}
	return out, nil
}

// GetScriptTypingDataMap returns the characters of a script with the keys that type them,
// e.g. to show a typing reference for the script.
//
// script can be a script or language name (e.g. "Devanagari", "Hindi", "tel").
func GetScriptTypingDataMap(script string) (ScriptTypingDataMap, error) {
	data, err := scriptdata.GetScriptData(script)
	if err != nil {
		return ScriptTypingDataMap{}, err
	}
	normalData, err := scriptdata.GetScriptData("Normal")
	if err != nil {
		return ScriptTypingDataMap{}, err
	}

	commonKramaMap := make([]TypingDataMapItem, len(data.KramaTextArr))
	for i, item := range data.KramaTextArr {
		commonKramaMap[i] = TypingDataMapItem{Text: item.Text, Type: listTypeOf(data, item.ListArrRef)}
	}
	scriptSpecificKramaMap := make([]TypingDataMapItem, len(data.CustomScriptCharsArr))
	for i, item := range data.CustomScriptCharsArr {
		scriptSpecificKramaMap[i] = TypingDataMapItem{Text: item.Text, Type: listTypeOf(data, item.FirstRef)}
	}

	// A key without a krama in the typing map is read from the Normal krama (Step 2 of the
	// transliteration), the first index of its text wins
	type textIndex struct {
		text  string
		index int
	}
	var normalKramaIndex []textIndex
	normalIndexOf := map[string]int{}
	for i, item := range normalData.KramaTextArr {
		if item.Text == "" {
			continue
		}
		if _, seen := normalIndexOf[item.Text]; !seen {
			normalIndexOf[item.Text] = i
			normalKramaIndex = append(normalKramaIndex, textIndex{item.Text, i})
		}
	}

	typingMapTexts := map[string]struct{}{}
	var multiKramaKeys []TypingDataMapItem

	for _, entry := range data.TypingTextToKramaMapArr {
		key, item := entry.Text, entry.Value
		typingMapTexts[key] = struct{}{}
		if key == "" {
			continue
		}

		if item.CustomBackRef == nil && len(item.Krama) == 0 {
			// a prefix of longer keys which is a character too (`sh` -> श, the start of `shh`)
			if i, ok := normalIndexOf[key]; ok && i < len(commonKramaMap) {
				commonKramaMap[i].Mappings = append(commonKramaMap[i].Mappings, key)
			}
			continue
		}

		if item.CustomBackRef != nil {
			if i := int(*item.CustomBackRef); i >= 0 && i < len(scriptSpecificKramaMap) {
				scriptSpecificKramaMap[i].Mappings = append(scriptSpecificKramaMap[i].Mappings, key)
			}
			continue
		}

		if len(item.Krama) == 1 {
			if i := int(item.Krama[0]); i >= 0 && i < len(commonKramaMap) {
				commonKramaMap[i].Mappings = append(commonKramaMap[i].Mappings, key)
			}
			continue
		}

		// A key of several krama (`x` -> क्ष). An intermediate typing state (`AU` of `AUM`)
		// is not a key of its own
		if len(item.Next) != 0 {
			continue
		}
		allValid := true
		for _, k := range item.Krama {
			if k < 0 {
				allValid = false
				break
			}
		}
		if !allValid {
			continue
		}
		var text strings.Builder
		for _, k := range item.Krama {
			if int(k) < len(data.KramaTextArr) {
				text.WriteString(data.KramaTextArr[k].Text)
			}
		}
		listType := ListTypeAnya
		if last := int(item.Krama[len(item.Krama)-1]); last < len(data.KramaTextArr) {
			listType = listTypeOf(data, data.KramaTextArr[last].ListArrRef)
		}
		multiKramaKeys = append(multiKramaKeys, TypingDataMapItem{Text: text.String(), Type: listType, Mappings: []string{key}})
	}

	// the keys which are not in the typing map at all (`m` -> म), read by their code point
	for _, ti := range normalKramaIndex {
		if _, inMap := typingMapTexts[ti.text]; inMap || utf8.RuneCountInString(ti.text) != 1 {
			continue
		}
		if ti.index < len(commonKramaMap) {
			commonKramaMap[ti.index].Mappings = append(commonKramaMap[ti.index].Mappings, ti.text)
		}
	}

	// A key whose character this script lacks falls back to an empty text (`.a1` to the
	// a1 mAtrA, which is the empty a mAtrA in Devanagari), nothing to show for it.
	// The context clearing `q` has no text either.
	return ScriptTypingDataMap{
		CommonKramaMap:         withoutEmptyText(mergeDuplicateTextMappings(append(commonKramaMap, multiKramaKeys...))),
		ScriptSpecificKramaMap: withoutEmptyText(mergeDuplicateTextMappings(scriptSpecificKramaMap)),
	}, nil
}

// mergeDuplicateTextMappings merges the items with the same text and type (keeping the
// mappings unique and in order) and drops the items without mappings.
func mergeDuplicateTextMappings(items []TypingDataMapItem) []TypingDataMapItem {
	type textType struct {
		text     string
		listType ListType
	}
	indexOf := map[textType]int{}
	var seen []map[string]struct{}
	var out []TypingDataMapItem
	for _, item := range items {
		key := textType{item.Text, item.Type}
		i, exists := indexOf[key]
		if !exists {
			i = len(out)
			indexOf[key] = i
			out = append(out, TypingDataMapItem{Text: item.Text, Type: item.Type, Mappings: []string{}})
			seen = append(seen, map[string]struct{}{})
		}
		for _, m := range item.Mappings {
			if _, dup := seen[i][m]; !dup {
				seen[i][m] = struct{}{}
				out[i].Mappings = append(out[i].Mappings, m)
			}
		}
	}
	filtered := out[:0]
	for _, item := range out {
		if len(item.Mappings) != 0 {
			filtered = append(filtered, item)
		}
	}
	return filtered
}

func withoutEmptyText(items []TypingDataMapItem) []TypingDataMapItem {
	out := make([]TypingDataMapItem, 0, len(items))
	for _, item := range items {
		if item.Text != "" {
			out = append(out, item)
		}
	}
	return out
}
