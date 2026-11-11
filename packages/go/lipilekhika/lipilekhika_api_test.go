package lipilekhika

import (
	"slices"
	"testing"
)

func TestScriptLists(t *testing.T) {
	for _, name := range []string{"Devanagari", "Telugu", "Normal", "Romanized"} {
		if !slices.Contains(ScriptList, name) {
			t.Errorf("ScriptList has no %q", name)
		}
	}
	for _, name := range []string{"Hindi", "Sanskrit", "English"} {
		if !slices.Contains(LangList, name) {
			t.Errorf("LangList has no %q", name)
		}
	}
	// every language and script, each name once
	seen := map[string]bool{}
	for _, name := range AllScriptLangList {
		if seen[name] {
			t.Errorf("AllScriptLangList has %q twice", name)
		}
		seen[name] = true
	}
	for _, name := range append(slices.Clone(ScriptList), LangList...) {
		if !seen[name] {
			t.Errorf("AllScriptLangList has no %q", name)
		}
	}
}

func TestGetNormalizedScriptName(t *testing.T) {
	for in, want := range map[string]string{"tel": "Telugu", "Hindi": "Devanagari", "devanagari": "Devanagari", "Normal": "Normal"} {
		got, err := GetNormalizedScriptName(in)
		if err != nil || got != want {
			t.Errorf("GetNormalizedScriptName(%q) = %q, %v; want %q", in, got, err, want)
		}
	}
	if _, err := GetNormalizedScriptName("not a script"); err == nil {
		t.Error("GetNormalizedScriptName of an unknown name: no error")
	}
}

func TestGetAllOptions(t *testing.T) {
	opts, err := GetAllOptions("Normal", "Devanagari")
	if err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"normal_to_brahmic:include_inherent_vowel", "normal_to_brahmic:keep_ascii_numerals"} {
		if !slices.Contains(opts, key) {
			t.Errorf("GetAllOptions(Normal, Devanagari) has no %q: %v", key, opts)
		}
	}
	if slices.Contains(opts, "all_to_sinhala:use_conjunct_enabling_halant") {
		t.Errorf("GetAllOptions(Normal, Devanagari) has a Sinhala option: %v", opts)
	}
	// every listed option is accepted by Transliterate
	trans := map[string]bool{}
	for _, key := range opts {
		trans[key] = true
	}
	if _, err := Transliterate("kamal", "Normal", "Devanagari", trans); err != nil {
		t.Error(err)
	}
	// the same script: the text is returned as it is
	if same, err := GetAllOptions("Hindi", "Sanskrit"); err != nil || len(same) != 0 {
		t.Errorf("GetAllOptions(Hindi, Sanskrit) = %v, %v; want empty", same, err)
	}
	if _, err := GetAllOptions("Normal", "not a script"); err == nil {
		t.Error("GetAllOptions of an unknown name: no error")
	}
}

func TestPreloadScriptData(t *testing.T) {
	if err := PreloadScriptData("Telugu"); err != nil {
		t.Error(err)
	}
	if err := PreloadScriptData("not a script"); err == nil {
		t.Error("PreloadScriptData of an unknown name: no error")
	}
}

// the examples of the package documentation
func TestDocExamples(t *testing.T) {
	if out, _ := Transliterate("namaskAraH", "Normal", "Devanagari", nil); out != "नमस्कारः" {
		t.Errorf("got %q", out)
	}
	opts := map[string]bool{"normal_to_brahmic:include_inherent_vowel": true}
	if out, _ := Transliterate("kamal", "Normal", "Devanagari", opts); out != "कमल" {
		t.Errorf("got %q", out)
	}
	if out, _ := Transliterate("kamal", "Normal", "Devanagari", nil); out != "कमल्" {
		t.Errorf("got %q", out)
	}
}
