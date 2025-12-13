package scriptdata

import (
	"encoding/json"
	"fmt"
)

type ScriptType string

const (
	ScriptTypeBrahmic ScriptType = "brahmic"
	ScriptTypeOther   ScriptType = "other"
)

// KramaTextEntry corresponds to JSON `krama_text_arr` items which are arrays like:
// [krama_key: string, list_arr_ref: number|null, ...extra columns]
type KramaTextEntry struct {
	Key     string
	ListRef *int
}

func (e *KramaTextEntry) UnmarshalJSON(b []byte) error {
	var raw []json.RawMessage
	if err := json.Unmarshal(b, &raw); err != nil {
		return err
	}
	if len(raw) < 2 {
		return fmt.Errorf("krama_text_arr entry: expected len>=2, got %d", len(raw))
	}
	if err := json.Unmarshal(raw[0], &e.Key); err != nil {
		return fmt.Errorf("krama_text_arr[0]: %w", err)
	}
	// list ref can be null
	if string(raw[1]) == "null" {
		e.ListRef = nil
		return nil
	}
	var v int
	if err := json.Unmarshal(raw[1], &v); err != nil {
		return fmt.Errorf("krama_text_arr[1]: %w", err)
	}
	e.ListRef = &v
	return nil
}

type ListItem struct {
	KramaRef      []int  `json:"krama_ref"`
	Type          string `json:"type"`
	MatraKramaRef *[]int `json:"mAtrA_krama_ref,omitempty"`
}

type TextToKramaInfo struct {
	Next            []string `json:"next,omitempty"`
	Krama           *[]int   `json:"krama,omitempty"`
	FallbackListRef *int     `json:"fallback_list_ref,omitempty"`
}

type TextToKramaEntry struct {
	Text string
	Info TextToKramaInfo
}

func (e *TextToKramaEntry) UnmarshalJSON(b []byte) error {
	var raw []json.RawMessage
	if err := json.Unmarshal(b, &raw); err != nil {
		return err
	}
	if len(raw) != 2 {
		return fmt.Errorf("text_to_krama_map entry: expected len=2, got %d", len(raw))
	}
	if err := json.Unmarshal(raw[0], &e.Text); err != nil {
		return fmt.Errorf("text_to_krama_map[0]: %w", err)
	}
	if err := json.Unmarshal(raw[1], &e.Info); err != nil {
		return fmt.Errorf("text_to_krama_map[1]: %w", err)
	}
	return nil
}

type ScriptData struct {
	ScriptType ScriptType `json:"script_type"`
	ScriptName string     `json:"script_name"`
	ScriptID   int        `json:"script_id"`

	// brahmic
	Halant        string `json:"halant,omitempty"`
	Nuqta         string `json:"nuqta,omitempty"`
	SchwaProperty bool   `json:"schwa_property,omitempty"`

	// other
	SchwaCharacter string `json:"schwa_character,omitempty"`

	TextToKramaMap    []TextToKramaEntry `json:"text_to_krama_map"`
	List              []ListItem         `json:"list"`
	KramaTextArr      []KramaTextEntry   `json:"krama_text_arr"`
	KramaTextArrIndex []int              `json:"krama_text_arr_index"`
}

func (sd *ScriptData) KramaTextOrEmpty(idx int) string {
	if idx < 0 || idx >= len(sd.KramaTextArr) {
		return ""
	}
	return sd.KramaTextArr[idx].Key
}

func (sd *ScriptData) ListItemAtKramaIndex(idx int) *ListItem {
	if idx < 0 || idx >= len(sd.KramaTextArr) {
		return nil
	}
	ref := sd.KramaTextArr[idx].ListRef
	if ref == nil {
		return nil
	}
	if *ref < 0 || *ref >= len(sd.List) {
		return nil
	}
	return &sd.List[*ref]
}
