package lipilekhika

import (
	"slices"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/scriptdata"
	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/transliterate"
)

var scriptListData = scriptdata.MustGetScriptListData()

var (
	// ScriptList are the names of the supported scripts (e.g. "Devanagari", "Telugu", "Normal").
	ScriptList = slices.Clone(scriptListData.Scripts)
	// LangList are the names of the supported languages (e.g. "Hindi", "Sanskrit", "English").
	// A language is written in a script: "Hindi" is "Devanagari".
	LangList = slices.Clone(scriptListData.Langs)
	// AllScriptLangList are the languages and the scripts (a name in both only once),
	// every name the functions take besides the aliases (e.g. "dev", "tel").
	AllScriptLangList = allScriptLangList()
)

func allScriptLangList() []string {
	out := slices.Clone(scriptListData.Langs)
	for _, script := range scriptListData.Scripts {
		if !slices.Contains(out, script) {
			out = append(out, script)
		}
	}
	return out
}

// Transliterate transliterates text from fromScript to toScript.
// fromScript and toScript can be script or language names (e.g. "Devanagari", "tel").
// transOptions can be nil; keys are custom option names (e.g. "all_to_sinhala:use_conjunct_enabling_halant"),
// see [GetAllOptions] for the options of a script pair.
func Transliterate(
	text string,
	fromScript, toScript string,
	transOptions map[string]bool,
) (string, error) {
	return transliterate.Transliterate(text, fromScript, toScript, transOptions)
}

// GetAllOptions returns the custom transliteration options (the keys of transOptions of
// [Transliterate]) that have an effect from fromScript to toScript.
// It is empty when both are the same script ("Hindi" -> "Sanskrit").
func GetAllOptions(fromScript, toScript string) ([]string, error) {
	return transliterate.GetAllOptions(fromScript, toScript)
}

// GetNormalizedScriptName returns the script a script name, language name or alias refers to:
// "tel" -> "Telugu", "Hindi" -> "Devanagari", "devanagari" -> "Devanagari".
// It returns an error for an unknown name.
func GetNormalizedScriptName(name string) (string, error) {
	return scriptdata.GetNormalizedScriptName(name)
}

// PreloadScriptData loads the script data ahead of time, so that the first [Transliterate]
// call (or typing context) does not take the time to load it.
// The data of all scripts is loaded at once, name only has to be a valid script or language name.
func PreloadScriptData(name string) error {
	_, err := scriptdata.GetScriptData(name)
	return err
}
