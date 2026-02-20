package scriptdata

import (
	"testing"
)

func TestEmbeddedDataParses(t *testing.T) {
	listData, err := GetScriptListData()
	if err != nil {
		t.Fatalf("GetScriptListData failed: %v", err)
	}
	if len(listData.Scripts) == 0 {
		t.Fatalf("expected scripts in script list")
	}

	options, err := GetCustomOptionsMap()
	if err != nil {
		t.Fatalf("GetCustomOptionsMap failed: %v", err)
	}
	if len(options) == 0 {
		t.Fatalf("expected non-empty custom options")
	}

	for _, script := range listData.Scripts {
		if _, err := GetScriptData(script); err != nil {
			t.Fatalf("GetScriptData(%q) failed: %v", script, err)
		}
	}
}

func TestGetNormalizedScriptNameParityCases(t *testing.T) {
	cases := map[string]string{
		"dev":       "Devanagari",
		"TAM-EXT":   "Tamil-Extended",
		"hindi":     "Devanagari",
		"English":   "Normal",
		"oriya":     "Odia",
		"rom":       "Romanized",
		"Gurumukhi": "Gurumukhi",
	}

	for input, want := range cases {
		got, err := GetNormalizedScriptName(input)
		if err != nil {
			t.Fatalf("GetNormalizedScriptName(%q) returned error: %v", input, err)
		}
		if got != want {
			t.Fatalf("GetNormalizedScriptName(%q): got %q, want %q", input, got, want)
		}
	}

	if _, err := GetNormalizedScriptName("unknown-script"); err == nil {
		t.Fatalf("expected error for invalid script name")
	}
}
