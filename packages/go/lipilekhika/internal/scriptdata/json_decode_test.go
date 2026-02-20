package scriptdata

import (
	"bytes"
	"encoding/gob"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestJSONDecodePreservesKramaListRef(t *testing.T) {
	path := filepath.Join("..", "..", "data", "script_data.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read script_data.json: %v", err)
	}
	all := map[string]ScriptData{}
	if err := json.Unmarshal(raw, &all); err != nil {
		t.Fatalf("unmarshal script_data.json: %v", err)
	}
	dev, ok := all["Devanagari"]
	if !ok {
		t.Fatalf("missing Devanagari in script_data.json")
	}
	if len(dev.KramaTextArr) <= 1 {
		t.Fatalf("unexpected krama_text_arr size: %d", len(dev.KramaTextArr))
	}
	if dev.KramaTextArr[1].ListArrRef == nil {
		t.Fatalf("krama_text_arr[1].list_ref is nil, expected non-nil")
	}
}

func TestGobBlobPreservesKramaListRef(t *testing.T) {
	path := filepath.Join("..", "..", "data", "gob", "script_data.gob")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read script_data.gob: %v", err)
	}
	var blob ScriptDataBlob
	if err := gob.NewDecoder(bytes.NewReader(raw)).Decode(&blob); err != nil {
		t.Fatalf("decode script_data.gob: %v", err)
	}
	all := blob.ToMap()
	dev, ok := all["Devanagari"]
	if !ok {
		t.Fatalf("missing Devanagari in script_data.gob")
	}
	if len(dev.KramaTextArr) <= 1 {
		t.Fatalf("unexpected krama_text_arr size: %d", len(dev.KramaTextArr))
	}
	if dev.KramaTextArr[1].ListArrRef == nil {
		t.Fatalf("gob krama_text_arr[1].list_ref is nil, expected non-nil")
	}
}

func TestGobBlobPreservesTypingEntryOrderForCustomBackRefs(t *testing.T) {
	path := filepath.Join("..", "..", "data", "gob", "script_data.gob")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read script_data.gob: %v", err)
	}
	var blob ScriptDataBlob
	if err := gob.NewDecoder(bytes.NewReader(raw)).Decode(&blob); err != nil {
		t.Fatalf("decode script_data.gob: %v", err)
	}
	all := blob.ToMap()
	tamil, ok := all["Tamil"]
	if !ok {
		t.Fatalf("missing Tamil in script_data.gob")
	}
	if len(tamil.CustomScriptCharsArr) <= 3 {
		t.Fatalf("unexpected tamil custom chars length: %d", len(tamil.CustomScriptCharsArr))
	}
	ref := tamil.CustomScriptCharsArr[3].SecondRef
	if ref == nil {
		t.Fatalf("tamil custom char second_ref is nil")
	}
	idx := int(*ref)
	if idx < 0 || idx >= len(tamil.TypingTextMapEntries) {
		t.Fatalf("tamil second_ref out of range: %d", idx)
	}
	if got := tamil.TypingTextMapEntries[idx].Text; got != ".10" {
		t.Fatalf("typing entry mismatch at second_ref index %d: got %q want %q", idx, got, ".10")
	}
}
