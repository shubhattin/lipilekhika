package transliterate

import (
	"sort"
	"strings"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/scriptdata"
)

func kramaTextOrEmpty(s *scriptdata.ScriptData, idx int) string {
	if idx < 0 || idx >= len(s.KramaTextArr) {
		return ""
	}
	return s.KramaTextArr[idx].Text
}

func kramaIndexOfText(s *scriptdata.ScriptData, text string) int {
	idx := binarySearchLowerWithIndex(
		s.KramaTextArr,
		s.KramaTextArrIndex,
		text,
		func(arr []scriptdata.KramaTextItem, i int) string { return arr[i].Text },
	)
	return idx
}

func binarySearchLowerWithIndex(
	arr []scriptdata.KramaTextItem,
	index []int,
	target string,
	accessor func([]scriptdata.KramaTextItem, int) string,
) int {
	if len(index) == 0 {
		return -1
	}
	left, right := 0, len(index)-1
	result := -1
	for left <= right {
		mid := (left + right) / 2
		origIdx := index[mid]
		val := accessor(arr, origIdx)
		cmp := strings.Compare(target, val)
		if cmp == 0 {
			result = origIdx
			right = mid - 1
		} else if cmp < 0 {
			right = mid - 1
		} else {
			left = mid + 1
		}
	}
	return result
}

func binarySearchLowerTextMap(entries []textMapEntrySorted, target string) int {
	if len(entries) == 0 {
		return -1
	}
	left, right := 0, len(entries)-1
	result := -1
	for left <= right {
		mid := (left + right) / 2
		val := entries[mid].Text
		cmp := strings.Compare(target, val)
		if cmp == 0 {
			result = mid
			right = mid - 1
		} else if cmp < 0 {
			right = mid - 1
		} else {
			left = mid + 1
		}
	}
	return result
}

type textMapEntrySorted struct {
	Text  string
	Value scriptdata.TextToKramaMap
}

func textMapToSortedEntries(m map[string]scriptdata.TextToKramaMap) []textMapEntrySorted {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	out := make([]textMapEntrySorted, 0, len(keys))
	for _, k := range keys {
		out = append(out, textMapEntrySorted{Text: k, Value: m[k]})
	}
	return out
}

type resultStringBuilder struct {
	result []string
}

func newResultStringBuilder() *resultStringBuilder {
	return &resultStringBuilder{result: make([]string, 0)}
}

func (r *resultStringBuilder) emit(text string) {
	if text == "" {
		return
	}
	r.result = append(r.result, text)
}

func (r *resultStringBuilder) emitPieces(pieces []string) {
	for _, p := range pieces {
		r.emit(p)
	}
}

func (r *resultStringBuilder) lastPiece() string {
	if len(r.result) == 0 {
		return ""
	}
	return r.result[len(r.result)-1]
}

func (r *resultStringBuilder) LastChar() (string, bool) {
	lp := r.lastPiece()
	if lp == "" {
		return "", false
	}
	runes := []rune(lp)
	if len(runes) == 0 {
		return "", false
	}
	return string(runes[len(runes)-1]), true
}

func (r *resultStringBuilder) popLastChar() (string, bool) {
	if len(r.result) == 0 {
		return "", false
	}
	lp := r.result[len(r.result)-1]
	runes := []rune(lp)
	if len(runes) == 0 {
		return "", false
	}
	ch := string(runes[len(runes)-1])
	r.result[len(r.result)-1] = string(runes[:len(runes)-1])
	return ch, true
}

func (r *resultStringBuilder) rewriteTailPieces(count int, newPieces []string) {
	start := len(r.result) - count
	if start < 0 {
		start = 0
	}
	r.result = r.result[:start]
	for _, p := range newPieces {
		if p != "" {
			r.result = append(r.result, p)
		}
	}
}

func (r *resultStringBuilder) withLastCharMovedAfter(beforePieces, afterPieces []string) {
	ch, ok := r.popLastChar()
	if !ok {
		r.emitPieces(beforePieces)
		r.emitPieces(afterPieces)
		return
	}
	r.emitPieces(beforePieces)
	r.emit(ch)
	r.emitPieces(afterPieces)
}

func (r *resultStringBuilder) peekAt(index int) (ch string, ok bool) {
	if len(r.result) == 0 {
		return "", false
	}
	if index < 0 {
		index = len(r.result) + index
	}
	if index < 0 || index >= len(r.result) {
		return "", false
	}
	return r.result[index], true
}

func (r *resultStringBuilder) rewriteAt(index int, newPiece string) {
	if len(r.result) == 0 {
		return
	}
	if index < 0 {
		index = len(r.result) + index
	}
	if index < 0 || index >= len(r.result) {
		return
	}
	r.result[index] = newPiece
}

func (r *resultStringBuilder) toString() string {
	return strings.Join(r.result, "")
}

type prevContextItem struct {
	text string
	list *scriptdata.ListItem
}

type prevContextBuilder struct {
	arr    []prevContextItem
	maxLen int
}

func newPrevContextBuilder(maxLen int) *prevContextBuilder {
	return &prevContextBuilder{arr: make([]prevContextItem, 0), maxLen: maxLen}
}

func (p *prevContextBuilder) clear() {
	p.arr = p.arr[:0]
}

func (p *prevContextBuilder) length() int {
	return len(p.arr)
}

func (p *prevContextBuilder) resolveIndex(i int) int {
	if len(p.arr) == 0 {
		return -1
	}
	if i < 0 {
		i = len(p.arr) + i
	}
	if i < 0 || i >= len(p.arr) {
		return -1
	}
	return i
}

func (p *prevContextBuilder) typeAt(i int) *scriptdata.ListItem {
	idx := p.resolveIndex(i)
	if idx < 0 {
		return nil
	}
	return p.arr[idx].list
}

func (p *prevContextBuilder) textAt(i int) string {
	idx := p.resolveIndex(i)
	if idx < 0 {
		return ""
	}
	return p.arr[idx].text
}

func (p *prevContextBuilder) push(text string, list *scriptdata.ListItem) {
	if text == "" {
		return
	}
	p.arr = append(p.arr, prevContextItem{text: text, list: list})
	if len(p.arr) > p.maxLen {
		p.arr = p.arr[1:]
	}
}

type inputCursor struct {
	text string
	pos  int
}

func newInputCursor(text string) *inputCursor {
	return &inputCursor{text: text, pos: 0}
}

func (c *inputCursor) runeCount() int {
	return len([]rune(c.text))
}

func (c *inputCursor) peekAtRune(runeIndex int) (ch string, width int, ok bool) {
	runes := []rune(c.text)
	if runeIndex < 0 || runeIndex >= len(runes) {
		return "", 0, false
	}
	ch = string(runes[runeIndex])
	return ch, len(ch), true
}

func (c *inputCursor) peek() (ch string, width int, ok bool) {
	return c.peekAtRune(c.pos)
}

func (c *inputCursor) advanceRunes(n int) {
	c.pos += n
}

func (c *inputCursor) sliceRunes(start, end int) string {
	runes := []rune(c.text)
	if start < 0 {
		start = 0
	}
	if end > len(runes) {
		end = len(runes)
	}
	if start >= end {
		return ""
	}
	return string(runes[start:end])
}

type peekAtFunc func(index int) (ch string, ok bool)

func matchPrevKramaSequence(
	peekAt peekAtFunc,
	anchorIndex int,
	prev []int,
	s *scriptdata.ScriptData,
) (matched bool, matchedLen int) {
	for i := 0; i < len(prev); i++ {
		expectedKrama := prev[len(prev)-1-i]
		info, ok := peekAt(anchorIndex - i)
		if !ok {
			return false, 0
		}
		gotKrama := kramaIndexOfText(s, info)
		if gotKrama < 0 || gotKrama != expectedKrama {
			return false, 0
		}
	}
	return true, len(prev)
}

func replaceWithPieces(replaceWith []int16, s *scriptdata.ScriptData) []string {
	out := make([]string, 0, len(replaceWith))
	for _, k := range replaceWith {
		t := kramaTextOrEmpty(s, int(k))
		if t != "" {
			out = append(out, t)
		}
	}
	return out
}

var tamilExtendedSuperscriptNumbers = []rune{'²', '³', '⁴'}

func isTaExtSuperscriptTail(ch string) bool {
	if ch == "" {
		return false
	}
	r := []rune(ch)
	if len(r) != 1 {
		return false
	}
	for _, t := range tamilExtendedSuperscriptNumbers {
		if r[0] == t {
			return true
		}
	}
	return false
}

var vedicSvaras = []rune{'॒', '॑', '᳚', '᳛'}

func isVedicSvaraTail(ch string) bool {
	if ch == "" {
		return false
	}
	r := []rune(ch)
	if len(r) != 1 {
		return false
	}
	for _, v := range vedicSvaras {
		if r[0] == v {
			return true
		}
	}
	return false
}

func isScriptTamilExt(scriptName string) bool {
	return scriptName == "Tamil-Extended"
}

func emitPiecesWithReorder(
	result *resultStringBuilder,
	pieces []string,
	halant string,
	shouldReorder bool,
) {
	if len(pieces) == 0 {
		return
	}
	if !shouldReorder {
		result.emitPieces(pieces)
		return
	}
	first := ""
	if len(pieces) > 0 {
		first = pieces[0]
	}
	if strings.HasPrefix(first, halant) {
		restFirst := strings.TrimPrefix(first, halant)
		afterPieces := make([]string, 0)
		if restFirst != "" {
			afterPieces = append(afterPieces, restFirst)
		}
		afterPieces = append(afterPieces, pieces[1:]...)
		result.withLastCharMovedAfter([]string{halant}, afterPieces)
	} else {
		result.withLastCharMovedAfter(pieces, nil)
	}
}

var vedicSvarasTypingSymbols = []string{"_", "'''", "''", "'"}
var vedicSvarasNormalSymbols = []string{"↓", "↑↑↑", "↑↑", "↑"}

func applyTypingInputAliases(text, toScriptName string) string {
	if text == "" {
		return text
	}
	if strings.Contains(text, "x") {
		text = strings.ReplaceAll(text, "x", "kSh")
	}
	if isScriptTamilExt(toScriptName) {
		for i := range vedicSvarasTypingSymbols {
			sym := vedicSvarasTypingSymbols[i]
			if strings.Contains(text, sym) {
				text = strings.ReplaceAll(text, sym, vedicSvarasNormalSymbols[i])
			}
		}
	}
	return text
}

func listItemIsVyanjana(l *scriptdata.ListItem) bool {
	return l != nil && l.Type == "vyanjana"
}

func listItemIsMatra(l *scriptdata.ListItem) bool {
	return l != nil && l.Type == "mAtrA"
}

func listItemIsSvara(l *scriptdata.ListItem) bool {
	return l != nil && l.Type == "svara"
}

func listItemIsAnya(l *scriptdata.ListItem) bool {
	return l != nil && l.Type == "anya"
}
