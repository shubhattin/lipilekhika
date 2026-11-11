// Package lipilekhika transliterates text between Indian Brahmic scripts and their
// romanizations.
//
// [Transliterate] converts text from one script to another, by script or language name:
//
//	out, err := lipilekhika.Transliterate("namaskAraH", "Normal", "Devanagari", nil)
//	// out == "नमस्कारः"
//
// The names it takes are in [ScriptList] and [LangList] (both in [AllScriptLangList]), and
// aliases like "dev" or "tel". [GetNormalizedScriptName] returns the script a name refers to.
//
// Custom options change how text is transliterated between some scripts, passed as
// transOptions (option name -> enabled). [GetAllOptions] lists the options of a script pair:
//
//	opts := map[string]bool{"normal_to_brahmic:include_inherent_vowel": true}
//	out, err := lipilekhika.Transliterate("kamal", "Normal", "Devanagari", opts)
//	// out == "कमल" (without the option "कमल्")
//
// The script data is embedded in the package and loaded on first use;
// [PreloadScriptData] loads it ahead of time.
//
// # Typing
//
// Real-time typing (each key typed in Normal is shown in the script as it is typed) is in the
// [github.com/shubhattin/lipilekhika/packages/go/lipilekhika/typing] package, which also
// has the typing data of a script (the keys of each character).
//
// Documentation: https://lipilekhika.in/getting-started/go
package lipilekhika
