package typing

import (
	"slices"
	"testing"
)

func findItem(items []TypingDataMapItem, text string) *TypingDataMapItem {
	for i := range items {
		if items[i].Text == text {
			return &items[i]
		}
	}
	return nil
}

func TestGetScriptTypingDataMap(t *testing.T) {
	m, err := GetScriptTypingDataMap("Devanagari")
	if err != nil {
		t.Fatal(err)
	}
	for _, c := range []struct {
		text     string
		listType ListType
		key      string
	}{
		{"अ", ListTypeSvara, "a"},
		{"क", ListTypeVyanjana, "k"},
		{"ा", ListTypeMatra, ".A"}, // a standalone mAtrA key
		{"ॐ", ListTypeAnya, "AUM"},
		{"क्ष", ListTypeVyanjana, "x"}, // a key of several krama
		{"म", ListTypeVyanjana, "m"},   // a key read by its code point
	} {
		item := findItem(m.CommonKramaMap, c.text)
		if item == nil {
			t.Errorf("%q not in CommonKramaMap", c.text)
			continue
		}
		if item.Type != c.listType || !slices.Contains(item.Mappings, c.key) {
			t.Errorf("%q: %v %v; want type %v with key %q", c.text, item.Type, item.Mappings, c.listType, c.key)
		}
	}
	for _, items := range [][]TypingDataMapItem{m.CommonKramaMap, m.ScriptSpecificKramaMap} {
		for _, item := range items {
			if item.Text == "" || len(item.Mappings) == 0 {
				t.Errorf("item without text or keys: %+v", item)
			}
		}
	}

	// Malayalam chillus are listed as anya
	ml, err := GetScriptTypingDataMap("Malayalam")
	if err != nil {
		t.Fatal(err)
	}
	if item := findItem(ml.ScriptSpecificKramaMap, "ൻ"); item == nil || item.Type != ListTypeAnya || !slices.Contains(item.Mappings, ".n") {
		t.Errorf("Malayalam ൻ: %+v", item)
	}

	if _, err := GetScriptTypingDataMap("not a script"); err == nil {
		t.Error("GetScriptTypingDataMap of an unknown name: no error")
	}
}

func TestGetScriptKramaData(t *testing.T) {
	dev, err := GetScriptKramaData("Hindi")
	if err != nil {
		t.Fatal(err)
	}
	tel, err := GetScriptKramaData("tel")
	if err != nil {
		t.Fatal(err)
	}
	// the krama of every script has the same length
	if len(dev) == 0 || len(dev) != len(tel) {
		t.Fatalf("krama lengths: Devanagari %d, Telugu %d", len(dev), len(tel))
	}
	i := slices.IndexFunc(dev, func(x KramaDataItem) bool { return x.Text == "क" })
	if i < 0 || dev[i].Type != ListTypeVyanjana || tel[i].Text != "క" {
		t.Errorf("क at %d: %+v, Telugu %+v", i, dev[i], tel[i])
	}
	if _, err := GetScriptKramaData("not a script"); err == nil {
		t.Error("GetScriptKramaData of an unknown name: no error")
	}
}

func TestGetScriptInputTexts(t *testing.T) {
	itrans, err := GetScriptInputTexts("ITRANS")
	if err != nil {
		t.Fatal(err)
	}
	for _, text := range []string{"RRi", "R^i", "Ch", "chh", "x", "GY"} {
		if !slices.Contains(itrans, text) {
			t.Errorf("ITRANS should read %q", text)
		}
	}
	if slices.Contains(itrans, "") {
		t.Error("an empty text in the ITRANS input texts")
	}
	normal, err := GetScriptInputTexts("Normal")
	if err != nil || !slices.Contains(normal, "chh") {
		t.Errorf("Normal should read chh (err %v)", err)
	}
	if _, err := GetScriptInputTexts("not a script"); err == nil {
		t.Error("GetScriptInputTexts of an unknown name: no error")
	}
}

// the example of the package documentation
func TestDocExample(t *testing.T) {
	ctx, err := NewTypingContext("Devanagari", nil)
	if err != nil {
		t.Fatal(err)
	}
	diff, err := ctx.TakeKeyInput("k")
	if err != nil || diff.DiffAddText != "क्" {
		t.Errorf("TakeKeyInput(k) = %+v, %v", diff, err)
	}
}
