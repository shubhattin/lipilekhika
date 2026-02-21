package scriptdata

import (
	"bytes"
	"encoding/gob"
	"encoding/json"
	"fmt"
	"sort"
)

type ScriptType string

const (
	ScriptTypeBrahmic ScriptType = "brahmic"
	ScriptTypeOther   ScriptType = "other"
	ScriptTypeAll     ScriptType = "all"
)

type CheckIn string

const (
	CheckInInput  CheckIn = "input"
	CheckInOutput CheckIn = "output"
)

type TextToKramaMap struct {
	Next            []string `json:"next,omitempty"`
	Krama           []int16  `json:"krama,omitempty"`
	FallbackListRef *int16   `json:"fallback_list_ref,omitempty"`
	CustomBackRef   *int16   `json:"custom_back_ref,omitempty"`
}

type KramaTextItem struct {
	Text       string
	ListArrRef *int16
}

func (k *KramaTextItem) UnmarshalJSON(data []byte) error {
	var tuple []json.RawMessage
	if err := json.Unmarshal(data, &tuple); err != nil {
		return err
	}
	if len(tuple) != 2 {
		return fmt.Errorf("krama_text_arr tuple must have length 2")
	}
	if err := json.Unmarshal(tuple[0], &k.Text); err != nil {
		return err
	}
	if string(tuple[1]) != "null" {
		var ref int16
		if err := json.Unmarshal(tuple[1], &ref); err != nil {
			return err
		}
		k.ListArrRef = &ref
	}
	return nil
}

type CustomScriptCharItem struct {
	Text      string
	FirstRef  *int16
	SecondRef *int16
}

func (c *CustomScriptCharItem) UnmarshalJSON(data []byte) error {
	var tuple []json.RawMessage
	if err := json.Unmarshal(data, &tuple); err != nil {
		return err
	}
	if len(tuple) != 3 {
		return fmt.Errorf("custom_script_chars_arr tuple must have length 3")
	}
	if err := json.Unmarshal(tuple[0], &c.Text); err != nil {
		return err
	}
	if string(tuple[1]) != "null" {
		var ref int16
		if err := json.Unmarshal(tuple[1], &ref); err != nil {
			return err
		}
		c.FirstRef = &ref
	}
	if string(tuple[2]) != "null" {
		var ref int16
		if err := json.Unmarshal(tuple[2], &ref); err != nil {
			return err
		}
		c.SecondRef = &ref
	}
	return nil
}

type TextMapEntry struct {
	Text  string
	Value TextToKramaMap
}

func (t *TextMapEntry) UnmarshalJSON(data []byte) error {
	var tuple []json.RawMessage
	if err := json.Unmarshal(data, &tuple); err != nil {
		return err
	}
	if len(tuple) != 2 {
		return fmt.Errorf("text map tuple must have length 2")
	}
	if err := json.Unmarshal(tuple[0], &t.Text); err != nil {
		return err
	}
	if err := json.Unmarshal(tuple[1], &t.Value); err != nil {
		return err
	}
	return nil
}

type ListItem struct {
	Type          string  `json:"type"`
	KramaRef      []int16 `json:"krama_ref"`
	MatraKramaRef []int16 `json:"mAtrA_krama_ref,omitempty"`
}

func (l *ListItem) UnmarshalJSON(data []byte) error {
	type rawListItem struct {
		Type          string  `json:"type"`
		KramaRef      []int16 `json:"krama_ref"`
		MatraKramaRef []int16 `json:"mAtrA_krama_ref"`
	}

	var raw rawListItem
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	if raw.Type == "" {
		return fmt.Errorf("list item missing type")
	}
	if raw.Type == "svara" && len(raw.MatraKramaRef) == 0 {
		return fmt.Errorf("list item type=svara requires mAtrA_krama_ref")
	}
	l.Type = raw.Type
	l.KramaRef = raw.KramaRef
	l.MatraKramaRef = raw.MatraKramaRef
	return nil
}

type ScriptData struct {
	ScriptName string     `json:"script_name"`
	ScriptID   uint8      `json:"script_id"`
	ScriptType ScriptType `json:"script_type"`

	KramaTextArr         []KramaTextItem        `json:"krama_text_arr"`
	KramaTextArrIndex    []int                  `json:"krama_text_arr_index"`
	CustomScriptCharsArr []CustomScriptCharItem `json:"custom_script_chars_arr"`
	List                 []ListItem             `json:"list"`

	TextMap              map[string]TextToKramaMap `json:"-"`
	TypingTextMap        map[string]TextToKramaMap `json:"-"`
	TypingTextMapEntries []TextMapEntry            `json:"-"` // ordered for index lookup
	
	KramaTextLookup         map[string]int `json:"-"`
	CustomScriptCharsLookup map[string]int `json:"-"`

	SchwaProperty  bool    `json:"schwa_property,omitempty"`
	Halant         string  `json:"halant,omitempty"`
	Nuqta          *string `json:"nuqta,omitempty"`
	SchwaCharacter string  `json:"schwa_character,omitempty"`
}

func (s *ScriptData) initLookups() {
	s.KramaTextLookup = make(map[string]int, len(s.KramaTextArr))
	for i, item := range s.KramaTextArr {
		if _, exists := s.KramaTextLookup[item.Text]; !exists {
			s.KramaTextLookup[item.Text] = i
		}
	}
	s.CustomScriptCharsLookup = make(map[string]int, len(s.CustomScriptCharsArr))
	for i, item := range s.CustomScriptCharsArr {
		if _, exists := s.CustomScriptCharsLookup[item.Text]; !exists {
			s.CustomScriptCharsLookup[item.Text] = i
		}
	}
}

type scriptDataGob struct {
	ScriptName string
	ScriptID   uint8
	ScriptType ScriptType

	KramaTextArr         []kramaTextItemGob
	KramaTextArrIndex    []int
	CustomScriptCharsArr []customScriptCharItemGob
	List                 []ListItem
	TextMapEntries       []textMapEntryGob
	TypingTextEntries    []textMapEntryGob

	SchwaProperty  bool
	Halant         string
	Nuqta          *string
	SchwaCharacter string
}

type kramaTextItemGob struct {
	Text       string
	ListArrRef int16
}

type customScriptCharItemGob struct {
	Text      string
	FirstRef  int16
	SecondRef int16
}

type textToKramaMapGob struct {
	Next            []string
	Krama           []int16
	FallbackListRef int16
	CustomBackRef   int16
}

type textMapEntryGob struct {
	Text  string
	Value textToKramaMapGob
}

const missingRefSentinel int16 = -1

func refToGob(v *int16) int16 {
	if v == nil {
		return missingRefSentinel
	}
	return *v
}

func refFromGob(v int16) *int16 {
	if v == missingRefSentinel {
		return nil
	}
	out := v
	return &out
}

func kramaTextArrToGob(items []KramaTextItem) []kramaTextItemGob {
	out := make([]kramaTextItemGob, 0, len(items))
	for _, item := range items {
		out = append(out, kramaTextItemGob{
			Text:       item.Text,
			ListArrRef: refToGob(item.ListArrRef),
		})
	}
	return out
}

func kramaTextArrFromGob(items []kramaTextItemGob) []KramaTextItem {
	out := make([]KramaTextItem, 0, len(items))
	for _, item := range items {
		out = append(out, KramaTextItem{
			Text:       item.Text,
			ListArrRef: refFromGob(item.ListArrRef),
		})
	}
	return out
}

func customScriptCharsToGob(items []CustomScriptCharItem) []customScriptCharItemGob {
	out := make([]customScriptCharItemGob, 0, len(items))
	for _, item := range items {
		out = append(out, customScriptCharItemGob{
			Text:      item.Text,
			FirstRef:  refToGob(item.FirstRef),
			SecondRef: refToGob(item.SecondRef),
		})
	}
	return out
}

func customScriptCharsFromGob(items []customScriptCharItemGob) []CustomScriptCharItem {
	out := make([]CustomScriptCharItem, 0, len(items))
	for _, item := range items {
		out = append(out, CustomScriptCharItem{
			Text:      item.Text,
			FirstRef:  refFromGob(item.FirstRef),
			SecondRef: refFromGob(item.SecondRef),
		})
	}
	return out
}

func textEntryToGob(entry TextMapEntry) textMapEntryGob {
	return textMapEntryGob{
		Text: entry.Text,
		Value: textToKramaMapGob{
			Next:            entry.Value.Next,
			Krama:           entry.Value.Krama,
			FallbackListRef: refToGob(entry.Value.FallbackListRef),
			CustomBackRef:   refToGob(entry.Value.CustomBackRef),
		},
	}
}

func textEntryFromGob(entry textMapEntryGob) TextMapEntry {
	return TextMapEntry{
		Text: entry.Text,
		Value: TextToKramaMap{
			Next:            entry.Value.Next,
			Krama:           entry.Value.Krama,
			FallbackListRef: refFromGob(entry.Value.FallbackListRef),
			CustomBackRef:   refFromGob(entry.Value.CustomBackRef),
		},
	}
}

func textEntriesToGob(entries []TextMapEntry) []textMapEntryGob {
	out := make([]textMapEntryGob, 0, len(entries))
	for _, entry := range entries {
		out = append(out, textEntryToGob(entry))
	}
	return out
}

func textEntriesFromGob(entries []textMapEntryGob) []TextMapEntry {
	out := make([]TextMapEntry, 0, len(entries))
	for _, entry := range entries {
		out = append(out, textEntryFromGob(entry))
	}
	return out
}

func typingEntriesForGob(s ScriptData) []TextMapEntry {
	// typing_text_to_krama_map is index-addressed by custom script char back refs.
	// Preserve source order when available; sorting breaks those references.
	if len(s.TypingTextMapEntries) > 0 {
		out := make([]TextMapEntry, len(s.TypingTextMapEntries))
		copy(out, s.TypingTextMapEntries)
		return out
	}
	return textMapToSortedEntries(s.TypingTextMap)
}

func (s ScriptData) GobEncode() ([]byte, error) {
	textEntries := textMapToSortedEntries(s.TextMap)
	typingEntries := typingEntriesForGob(s)

	wire := scriptDataGob{
		ScriptName:           s.ScriptName,
		ScriptID:             s.ScriptID,
		ScriptType:           s.ScriptType,
		KramaTextArr:         kramaTextArrToGob(s.KramaTextArr),
		KramaTextArrIndex:    s.KramaTextArrIndex,
		CustomScriptCharsArr: customScriptCharsToGob(s.CustomScriptCharsArr),
		List:                 s.List,
		TextMapEntries:       textEntriesToGob(textEntries),
		TypingTextEntries:    textEntriesToGob(typingEntries),
		SchwaProperty:        s.SchwaProperty,
		Halant:               s.Halant,
		Nuqta:                s.Nuqta,
		SchwaCharacter:       s.SchwaCharacter,
	}

	var buf bytes.Buffer
	if err := gob.NewEncoder(&buf).Encode(wire); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func (s *ScriptData) GobDecode(data []byte) error {
	var wire scriptDataGob
	if err := gob.NewDecoder(bytes.NewReader(data)).Decode(&wire); err != nil {
		return err
	}
	*s = ScriptData{
		ScriptName:           wire.ScriptName,
		ScriptID:             wire.ScriptID,
		ScriptType:           wire.ScriptType,
		KramaTextArr:         kramaTextArrFromGob(wire.KramaTextArr),
		KramaTextArrIndex:    wire.KramaTextArrIndex,
		CustomScriptCharsArr: customScriptCharsFromGob(wire.CustomScriptCharsArr),
		List:                 wire.List,
		TextMap:              textEntriesToMap(textEntriesFromGob(wire.TextMapEntries)),
		TypingTextMap:        textEntriesToMap(textEntriesFromGob(wire.TypingTextEntries)),
		TypingTextMapEntries: textEntriesFromGob(wire.TypingTextEntries),
		SchwaProperty:        wire.SchwaProperty,
		Halant:               wire.Halant,
		Nuqta:                wire.Nuqta,
		SchwaCharacter:       wire.SchwaCharacter,
	}
	s.initLookups()
	return nil
}

func (s *ScriptData) UnmarshalJSON(data []byte) error {
	type scriptDataWire struct {
		ScriptName string     `json:"script_name"`
		ScriptID   uint8      `json:"script_id"`
		ScriptType ScriptType `json:"script_type"`

		KramaTextArr         []KramaTextItem        `json:"krama_text_arr"`
		KramaTextArrIndex    []int                  `json:"krama_text_arr_index"`
		TextToKramaMap       []TextMapEntry         `json:"text_to_krama_map"`
		TypingTextToKramaMap []TextMapEntry         `json:"typing_text_to_krama_map"`
		CustomScriptCharsArr []CustomScriptCharItem `json:"custom_script_chars_arr"`
		List                 []ListItem             `json:"list"`

		SchwaProperty  bool    `json:"schwa_property"`
		Halant         string  `json:"halant"`
		Nuqta          *string `json:"nuqta"`
		SchwaCharacter string  `json:"schwa_character"`
	}

	var wire scriptDataWire
	if err := json.Unmarshal(data, &wire); err != nil {
		return err
	}
	if wire.ScriptType != ScriptTypeBrahmic && wire.ScriptType != ScriptTypeOther {
		return fmt.Errorf("invalid script_type: %q", wire.ScriptType)
	}

	textMap, err := convertTextMap(wire.TextToKramaMap)
	if err != nil {
		return fmt.Errorf("text_to_krama_map: %w", err)
	}
	typingMap, err := convertTextMap(wire.TypingTextToKramaMap)
	if err != nil {
		return fmt.Errorf("typing_text_to_krama_map: %w", err)
	}

	*s = ScriptData{
		ScriptName:           wire.ScriptName,
		ScriptID:             wire.ScriptID,
		ScriptType:           wire.ScriptType,
		KramaTextArr:         wire.KramaTextArr,
		KramaTextArrIndex:    wire.KramaTextArrIndex,
		CustomScriptCharsArr: wire.CustomScriptCharsArr,
		List:                 wire.List,
		TextMap:              textMap,
		TypingTextMap:        typingMap,
		TypingTextMapEntries: wire.TypingTextToKramaMap,
		SchwaProperty:        wire.SchwaProperty,
		Halant:               wire.Halant,
		Nuqta:                wire.Nuqta,
		SchwaCharacter:       wire.SchwaCharacter,
	}
	s.initLookups()
	return nil
}

func convertTextMap(entries []TextMapEntry) (map[string]TextToKramaMap, error) {
	out := make(map[string]TextToKramaMap, len(entries))
	for _, entry := range entries {
		out[entry.Text] = entry.Value
	}
	return out, nil
}

func textMapToSortedEntries(input map[string]TextToKramaMap) []TextMapEntry {
	keys := make([]string, 0, len(input))
	for key := range input {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := make([]TextMapEntry, 0, len(keys))
	for _, key := range keys {
		out = append(out, TextMapEntry{Text: key, Value: input[key]})
	}
	return out
}

func textEntriesToMap(entries []TextMapEntry) map[string]TextToKramaMap {
	out := make(map[string]TextToKramaMap, len(entries))
	for _, entry := range entries {
		out[entry.Text] = entry.Value
	}
	return out
}

type Rule struct {
	Type string `json:"type"`

	UseReplace *bool    `json:"use_replace,omitempty"`
	CheckIn    *CheckIn `json:"check_in,omitempty"`

	Prev        []int16   `json:"prev,omitempty"`
	Following   []int16   `json:"following,omitempty"`
	ToReplace   [][]int16 `json:"to_replace,omitempty"`
	ReplaceWith []int16   `json:"replace_with,omitempty"`
	ReplaceText *string   `json:"replace_text,omitempty"`
}

func (r *Rule) UnmarshalJSON(data []byte) error {
	type rawRule struct {
		Type        string    `json:"type"`
		UseReplace  *bool     `json:"use_replace"`
		CheckIn     *CheckIn  `json:"check_in"`
		Prev        []int16   `json:"prev"`
		Following   []int16   `json:"following"`
		ToReplace   [][]int16 `json:"to_replace"`
		ReplaceWith []int16   `json:"replace_with"`
		ReplaceText *string   `json:"replace_text"`
	}

	var raw rawRule
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}

	switch raw.Type {
	case "replace_prev_krama_keys":
		if len(raw.Prev) == 0 || len(raw.Following) == 0 {
			return fmt.Errorf("replace_prev_krama_keys requires prev/following")
		}
	case "direct_replace":
		if len(raw.ToReplace) == 0 {
			return fmt.Errorf("direct_replace requires to_replace")
		}
	default:
		return fmt.Errorf("unknown rule type: %q", raw.Type)
	}

	*r = Rule{
		Type:        raw.Type,
		UseReplace:  raw.UseReplace,
		CheckIn:     raw.CheckIn,
		Prev:        raw.Prev,
		Following:   raw.Following,
		ToReplace:   raw.ToReplace,
		ReplaceWith: raw.ReplaceWith,
		ReplaceText: raw.ReplaceText,
	}
	return nil
}

type CustomOption struct {
	FromScriptName []string    `json:"from_script_name,omitempty"`
	FromScriptType *ScriptType `json:"from_script_type,omitempty"`
	ToScriptName   []string    `json:"to_script_name,omitempty"`
	ToScriptType   *ScriptType `json:"to_script_type,omitempty"`
	CheckIn        CheckIn     `json:"check_in"`
	Rules          []Rule      `json:"rules"`
}

type ScriptListJSON struct {
	Scripts             map[string]uint8  `json:"scripts"`
	Langs               map[string]uint8  `json:"langs"`
	LangScriptMap       map[string]string `json:"lang_script_map"`
	ScriptAlternatesMap map[string]string `json:"script_alternates_map"`
}

type ScriptListData struct {
	Scripts             []string
	Langs               []string
	LangScriptMap       map[string]string
	ScriptAlternatesMap map[string]string
}

type ScriptDataEntry struct {
	Name string
	Data ScriptData
}

type ScriptDataBlob struct {
	Entries []ScriptDataEntry
}

type CustomOptionEntry struct {
	Key   string
	Value CustomOption
}

type CustomOptionsBlob struct {
	Entries []CustomOptionEntry
}

type Uint8KV struct {
	Key   string
	Value uint8
}

type StringKV struct {
	Key   string
	Value string
}

type ScriptListBlob struct {
	Scripts             []Uint8KV
	Langs               []Uint8KV
	LangScriptMap       []StringKV
	ScriptAlternatesMap []StringKV
}

func NewScriptDataBlob(input map[string]ScriptData) ScriptDataBlob {
	keys := make([]string, 0, len(input))
	for key := range input {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	entries := make([]ScriptDataEntry, 0, len(keys))
	for _, key := range keys {
		entries = append(entries, ScriptDataEntry{Name: key, Data: input[key]})
	}
	return ScriptDataBlob{Entries: entries}
}

func (b ScriptDataBlob) ToMap() map[string]ScriptData {
	out := make(map[string]ScriptData, len(b.Entries))
	for _, entry := range b.Entries {
		out[entry.Name] = entry.Data
	}
	return out
}

func NewCustomOptionsBlob(input map[string]CustomOption) CustomOptionsBlob {
	keys := make([]string, 0, len(input))
	for key := range input {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	entries := make([]CustomOptionEntry, 0, len(keys))
	for _, key := range keys {
		entries = append(entries, CustomOptionEntry{Key: key, Value: input[key]})
	}
	return CustomOptionsBlob{Entries: entries}
}

func (b CustomOptionsBlob) ToMap() map[string]CustomOption {
	out := make(map[string]CustomOption, len(b.Entries))
	for _, entry := range b.Entries {
		out[entry.Key] = entry.Value
	}
	return out
}

func NewScriptListBlob(input ScriptListJSON) ScriptListBlob {
	return ScriptListBlob{
		Scripts:             sortU8Map(input.Scripts),
		Langs:               sortU8Map(input.Langs),
		LangScriptMap:       sortStringMap(input.LangScriptMap),
		ScriptAlternatesMap: sortStringMap(input.ScriptAlternatesMap),
	}
}

func (b ScriptListBlob) ToJSON() ScriptListJSON {
	return ScriptListJSON{
		Scripts:             u8SliceToMap(b.Scripts),
		Langs:               u8SliceToMap(b.Langs),
		LangScriptMap:       stringSliceToMap(b.LangScriptMap),
		ScriptAlternatesMap: stringSliceToMap(b.ScriptAlternatesMap),
	}
}

func sortU8Map(input map[string]uint8) []Uint8KV {
	keys := make([]string, 0, len(input))
	for key := range input {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := make([]Uint8KV, 0, len(keys))
	for _, key := range keys {
		out = append(out, Uint8KV{Key: key, Value: input[key]})
	}
	return out
}

func sortStringMap(input map[string]string) []StringKV {
	keys := make([]string, 0, len(input))
	for key := range input {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := make([]StringKV, 0, len(keys))
	for _, key := range keys {
		out = append(out, StringKV{Key: key, Value: input[key]})
	}
	return out
}

func u8SliceToMap(entries []Uint8KV) map[string]uint8 {
	out := make(map[string]uint8, len(entries))
	for _, entry := range entries {
		out[entry.Key] = entry.Value
	}
	return out
}

func stringSliceToMap(entries []StringKV) map[string]string {
	out := make(map[string]string, len(entries))
	for _, entry := range entries {
		out[entry.Key] = entry.Value
	}
	return out
}
