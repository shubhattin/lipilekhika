package scriptdata

import (
	"bytes"
	"encoding/gob"
	"testing"
)

func TestScriptDataBlobEncodingDeterministic(t *testing.T) {
	first, err := encodeBlobForTest(NewScriptDataBlob(map[string]ScriptData{
		"B": {
			ScriptName: "B",
			ScriptID:   2,
			ScriptType: ScriptTypeOther,
			TextMap: map[string]TextToKramaMap{
				"z": {Krama: []int16{9}},
				"a": {Krama: []int16{1}},
			},
			TypingTextMap: map[string]TextToKramaMap{
				"q": {Krama: []int16{7}},
				"m": {Krama: []int16{5}},
			},
		},
		"A": {
			ScriptName: "A",
			ScriptID:   1,
			ScriptType: ScriptTypeBrahmic,
			TextMap: map[string]TextToKramaMap{
				"x": {Krama: []int16{3}},
			},
			TypingTextMap: map[string]TextToKramaMap{
				"y": {Krama: []int16{4}},
			},
		},
	}))
	if err != nil {
		t.Fatalf("first encode failed: %v", err)
	}

	second, err := encodeBlobForTest(NewScriptDataBlob(map[string]ScriptData{
		"A": {
			ScriptName: "A",
			ScriptID:   1,
			ScriptType: ScriptTypeBrahmic,
			TextMap: map[string]TextToKramaMap{
				"x": {Krama: []int16{3}},
			},
			TypingTextMap: map[string]TextToKramaMap{
				"y": {Krama: []int16{4}},
			},
		},
		"B": {
			ScriptName: "B",
			ScriptID:   2,
			ScriptType: ScriptTypeOther,
			TextMap: map[string]TextToKramaMap{
				"a": {Krama: []int16{1}},
				"z": {Krama: []int16{9}},
			},
			TypingTextMap: map[string]TextToKramaMap{
				"m": {Krama: []int16{5}},
				"q": {Krama: []int16{7}},
			},
		},
	}))
	if err != nil {
		t.Fatalf("second encode failed: %v", err)
	}

	if !bytes.Equal(first, second) {
		t.Fatalf("expected deterministic gob bytes for ScriptDataBlob")
	}
}

func encodeBlobForTest(blob ScriptDataBlob) ([]byte, error) {
	var buf bytes.Buffer
	if err := gob.NewEncoder(&buf).Encode(blob); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
