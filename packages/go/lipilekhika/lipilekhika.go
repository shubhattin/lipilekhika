package lipilekhika

import (
	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/transliterate"
)

// Transliterate transliterates text from fromScript to toScript.
// fromScript and toScript can be script or language names (e.g. "Devanagari", "tel").
// transOptions can be nil; keys are custom option names (e.g. "all_to_sinhala:use_conjunct_enabling_halant").
func Transliterate(
	text string,
	fromScript, toScript string,
	transOptions map[string]bool,
) (string, error) {
	return transliterate.Transliterate(text, fromScript, toScript, transOptions)
}
