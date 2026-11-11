// Package typing provides a real-time typing context for incremental transliteration:
// keys typed in Normal are shown in a script as they are typed.
//
// [NewTypingContext] creates a context for a script, and [TypingContext.TakeKeyInput] takes
// each typed key and returns how to update the text ([TypingDiff]: the characters to delete
// before the cursor and the text to add):
//
//	ctx, err := typing.NewTypingContext("Devanagari", nil)
//	diff, err := ctx.TakeKeyInput("k")
//	// diff.DiffAddText == "क्"
//
// [GetScriptTypingDataMap] returns the characters of a script with the keys that type them,
// and [GetScriptKramaData] the characters of a script with their types.
package typing
