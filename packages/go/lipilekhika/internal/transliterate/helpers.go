package transliterate

import (
	"strings"
	"unicode/utf8"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/scriptdata"
)

func kramaTextOrEmpty(s *scriptdata.ScriptData, idx int) string {
	if idx < 0 || idx >= len(s.KramaTextArr) {
		return ""
	}
	return s.KramaTextArr[idx].Text
}

func kramaIndexOfText(s *scriptdata.ScriptData, text string) int {
	if idx, ok := s.KramaTextLookup[text]; ok {
		return idx
	}
	return -1
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

func (r *resultStringBuilder) LastChar() (rune, bool) {
	lp := r.lastPiece()
	if lp == "" {
		return 0, false
	}
	ch, size := utf8.DecodeLastRuneInString(lp)
	if ch == utf8.RuneError || size == 0 {
		return 0, false
	}
	return ch, true
}

func (r *resultStringBuilder) popLastChar() (string, bool) {
	if len(r.result) == 0 {
		return "", false
	}
	lp := r.result[len(r.result)-1]
	if lp == "" {
		return "", false
	}
	ch, size := utf8.DecodeLastRuneInString(lp)
	if ch == utf8.RuneError || size == 0 {
		return "", false
	}
	r.result[len(r.result)-1] = lp[:len(lp)-size]
	return string(ch), true
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

// prevContextBuilder is a fixed-size ring buffer — O(1) push and no GC pressure.
type prevContextBuilder struct {
	buf   [maxContextLength]prevContextItem
	head  int // index of the oldest element
	count int // number of elements stored
}

func newPrevContextBuilder(_ int) *prevContextBuilder {
	return &prevContextBuilder{}
}

func (p *prevContextBuilder) clear() {
	p.count = 0
	p.head = 0
}

func (p *prevContextBuilder) length() int {
	return p.count
}

func (p *prevContextBuilder) resolveIndex(i int) int {
	if p.count == 0 {
		return -1
	}
	if i < 0 {
		i = p.count + i
	}
	if i < 0 || i >= p.count {
		return -1
	}
	return (p.head + i) % maxContextLength
}

func (p *prevContextBuilder) typeAt(i int) *scriptdata.ListItem {
	idx := p.resolveIndex(i)
	if idx < 0 {
		return nil
	}
	return p.buf[idx].list
}

func (p *prevContextBuilder) textAt(i int) string {
	idx := p.resolveIndex(i)
	if idx < 0 {
		return ""
	}
	return p.buf[idx].text
}

func (p *prevContextBuilder) push(text string, list *scriptdata.ListItem) {
	if text == "" {
		return
	}
	if p.count < maxContextLength {
		p.buf[(p.head+p.count)%maxContextLength] = prevContextItem{text: text, list: list}
		p.count++
	} else {
		// Ring is full: overwrite oldest slot and advance head.
		p.buf[p.head] = prevContextItem{text: text, list: list}
		p.head = (p.head + 1) % maxContextLength
	}
}

type inputCursor struct {
	// runes is the pre-computed rune slice of the input text.
	// Storing it once avoids O(n) heap allocations on every character access,
	// which would otherwise make the main transliteration loop O(n²).
	runes []rune
	pos   int
}

func newInputCursor(text string) *inputCursor {
	return &inputCursor{runes: []rune(text), pos: 0}
}

func (c *inputCursor) runeCount() int {
	return len(c.runes)
}

// peekAtRune returns the rune at runeIndex without allocating a string.
func (c *inputCursor) peekAtRune(runeIndex int) (r rune, width int, ok bool) {
	if runeIndex < 0 || runeIndex >= len(c.runes) {
		return 0, 0, false
	}
	r = c.runes[runeIndex]
	w := utf8.RuneLen(r)
	if w < 0 {
		w = 1
	}
	return r, w, true
}

func (c *inputCursor) peek() (r rune, width int, ok bool) {
	return c.peekAtRune(c.pos)
}

func (c *inputCursor) advanceRunes(n int) {
	c.pos += n
}

func (c *inputCursor) sliceRunes(start, end int) string {
	if start < 0 {
		start = 0
	}
	if end > len(c.runes) {
		end = len(c.runes)
	}
	if start >= end {
		return ""
	}
	return string(c.runes[start:end])
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

func isTaExtSuperscriptTailRune(r rune) bool {
	for _, t := range tamilExtendedSuperscriptNumbers {
		if r == t {
			return true
		}
	}
	return false
}

func isTaExtSuperscriptTail(ch string) bool {
	if ch == "" {
		return false
	}
	r, size := utf8.DecodeRuneInString(ch)
	if r == utf8.RuneError || size != len(ch) {
		return false
	}
	return isTaExtSuperscriptTailRune(r)
}

var vedicSvaras = []rune{'॒', '॑', '᳚', '᳛'}

func isVedicSvaraTailRune(r rune) bool {
	for _, v := range vedicSvaras {
		if r == v {
			return true
		}
	}
	return false
}

func isVedicSvaraTail(ch string) bool {
	if ch == "" {
		return false
	}
	r, size := utf8.DecodeRuneInString(ch)
	if r == utf8.RuneError || size != len(ch) {
		return false
	}
	return isVedicSvaraTailRune(r)
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
