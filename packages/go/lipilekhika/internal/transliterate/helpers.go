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

// kramaIndexOfChar is kramaIndexOfText for a single rune (no string needed).
func kramaIndexOfChar(s *scriptdata.ScriptData, r rune) int {
	return s.KramaTextCharLookup.Get(r)
}

// kramaListItem returns the list item referenced by the krama_text_arr entry `kramaIdx`.
func kramaListItem(s *scriptdata.ScriptData, kramaIdx int) *scriptdata.ListItem {
	if kramaIdx < 0 || kramaIdx >= len(s.KramaTextArr) {
		return nil
	}
	ref := s.KramaTextArr[kramaIdx].ListArrRef
	if ref == nil {
		return nil
	}
	return listItemAt(s, int(*ref))
}

func listItemAt(s *scriptdata.ScriptData, i int) *scriptdata.ListItem {
	if i < 0 || i >= len(s.List) {
		return nil
	}
	return &s.List[i]
}

// resultStringBuilder constructs the output string.
//
// Uses a contiguous byte buffer with piece boundary offsets for O(1) piece-level access
// while avoiding per-piece allocations.
type resultStringBuilder struct {
	buf []byte
	// Byte offsets marking the start of each "piece" within `buf`.
	offsets []int
	// Most transliterations only append to the output. Avoid maintaining the piece index
	// unless something (custom rules, sinhala conjunct halant) can rewrite prior output.
	trackPieces bool
}

// newResultStringBuilder reuses `buf`'s allocation (its contents are discarded).
func newResultStringBuilder(buf []byte, capacity int, trackPieces bool) resultStringBuilder {
	if cap(buf) < capacity {
		buf = make([]byte, 0, capacity)
	}
	r := resultStringBuilder{buf: buf[:0], trackPieces: trackPieces}
	if trackPieces {
		// mostly we will be dealing with 3 bytes per character
		r.offsets = make([]int, 0, capacity/3+1)
	}
	return r
}

func (r *resultStringBuilder) pieceRange(i int) (int, int) {
	start := r.offsets[i]
	end := len(r.buf)
	if i+1 < len(r.offsets) {
		end = r.offsets[i+1]
	}
	return start, end
}

func (r *resultStringBuilder) emit(text string) {
	if text == "" {
		return
	}
	if r.trackPieces {
		r.offsets = append(r.offsets, len(r.buf))
	}
	r.buf = append(r.buf, text...)
}

// emitRune emits a single character without allocating a string.
func (r *resultStringBuilder) emitRune(c rune) {
	if r.trackPieces {
		r.offsets = append(r.offsets, len(r.buf))
	}
	r.buf = utf8.AppendRune(r.buf, c)
}

func (r *resultStringBuilder) emitPieces(pieces []string) {
	for _, p := range pieces {
		r.emit(p)
	}
}

func (r *resultStringBuilder) lastPiece() (string, bool) {
	if len(r.offsets) == 0 {
		return "", false
	}
	start, end := r.pieceRange(len(r.offsets) - 1)
	return string(r.buf[start:end]), true
}

func (r *resultStringBuilder) lastChar() (rune, bool) {
	if len(r.buf) == 0 {
		return 0, false
	}
	c, _ := utf8.DecodeLastRune(r.buf)
	return c, true
}

func (r *resultStringBuilder) popLastChar() (rune, bool) {
	if len(r.buf) == 0 {
		return 0, false
	}
	c, size := utf8.DecodeLastRune(r.buf)
	r.buf = r.buf[:len(r.buf)-size]
	// If popping made the last piece empty, remove its offset
	if n := len(r.offsets); n > 0 {
		lastOff := r.offsets[n-1]
		if lastOff >= len(r.buf) && lastOff > 0 {
			r.offsets = r.offsets[:n-1]
		}
	}
	return c, true
}

func (r *resultStringBuilder) rewriteTailPieces(count int, newPieces []string) {
	start := len(r.offsets) - count
	if start < 0 {
		start = 0
	}
	// Truncate buffer to the start of the removed region
	bufStart := len(r.buf)
	if start < len(r.offsets) {
		bufStart = r.offsets[start]
	}
	r.buf = r.buf[:bufStart]
	r.offsets = r.offsets[:start]
	for _, p := range newPieces {
		if p != "" {
			r.offsets = append(r.offsets, len(r.buf))
			r.buf = append(r.buf, p...)
		}
	}
}

func (r *resultStringBuilder) withLastCharMovedAfter(beforePieces, afterPieces []string) {
	c, ok := r.popLastChar()
	r.emitPieces(beforePieces)
	if ok {
		r.emitRune(c)
	}
	r.emitPieces(afterPieces)
}

// peekAt returns the piece at `index` (index can be -ve).
func (r *resultStringBuilder) peekAt(index int) (string, bool) {
	n := len(r.offsets)
	if index < 0 {
		index += n
	}
	if index < 0 || index >= n {
		return "", false
	}
	start, end := r.pieceRange(index)
	return string(r.buf[start:end]), true
}

func (r *resultStringBuilder) rewriteAt(index int, newPiece string) {
	n := len(r.offsets)
	if index < 0 {
		index += n
	}
	if index < 0 || index >= n {
		return
	}
	start, end := r.pieceRange(index)
	diff := len(newPiece) - (end - start)

	tail := append([]byte(nil), r.buf[end:]...)
	r.buf = append(append(r.buf[:start], newPiece...), tail...)

	// Adjust offsets for all pieces after the rewritten one
	for i := index + 1; i < n; i++ {
		r.offsets[i] += diff
	}
}

func (r *resultStringBuilder) emitPiecesWithReorder(pieces []string, halant string, shouldReorder bool) {
	if len(pieces) == 0 {
		return
	}
	if !shouldReorder {
		r.emitPieces(pieces)
		return
	}
	first := pieces[0]
	if strings.HasPrefix(first, halant) {
		restFirst := first[len(halant):]
		afterPieces := make([]string, 0, len(pieces))
		if restFirst != "" {
			afterPieces = append(afterPieces, restFirst)
		}
		afterPieces = append(afterPieces, pieces[1:]...)
		r.withLastCharMovedAfter([]string{halant}, afterPieces)
	} else {
		r.withLastCharMovedAfter(pieces, nil)
	}
}

const prevContextMaxLen = 3

type prevContextEntry struct {
	text string
	kind scriptdata.ListKind
}

// prevContextBuilder is a fixed-size sliding window over the last `prevContextMaxLen`
// context items, kept inline to avoid a heap allocation per transliteration call.
// Context consumers only ever need the list item kind, so that is stored instead of the item.
type prevContextBuilder struct {
	arr [prevContextMaxLen]prevContextEntry
	len int
}

func (p *prevContextBuilder) clear() {
	p.len = 0
}

func (p *prevContextBuilder) length() int {
	return p.len
}

// at returns the entry at index `i` (supports -ve indices).
func (p *prevContextBuilder) at(i int) *prevContextEntry {
	if i < 0 {
		i += p.len
	}
	if i < 0 || i >= p.len {
		return nil
	}
	return &p.arr[i]
}

// typeAt returns the kind at index `i` (`ListKindNone` if missing).
func (p *prevContextBuilder) typeAt(i int) scriptdata.ListKind {
	if e := p.at(i); e != nil {
		return e.kind
	}
	return scriptdata.ListKindNone
}

// textAt returns the text at index `i` ("" if missing; stored texts are never empty).
func (p *prevContextBuilder) textAt(i int) string {
	if e := p.at(i); e != nil {
		return e.text
	}
	return ""
}

// push adds a new context item, enforcing the max length and skipping empty text.
func (p *prevContextBuilder) push(text string, kind scriptdata.ListKind) {
	if text == "" {
		return
	}
	entry := prevContextEntry{text: text, kind: kind}
	if p.len == prevContextMaxLen {
		copy(p.arr[:], p.arr[1:])
		p.arr[prevContextMaxLen-1] = entry
	} else {
		p.arr[p.len] = entry
		p.len++
	}
}

type cursorChar struct {
	r   rune
	off int // byte offset in the text
}

// inputCursor walks the input by character (rune) units.
type inputCursor struct {
	// Pre-computed character table with byte offsets for O(1) indexed access.
	// Has a trailing sentinel (offset = len(text)) so the last character can be sliced.
	chars []cursorChar
	text  string
	pos   int
}

// newInputCursor reuses `buf`'s allocation for the char table (its contents are discarded).
func newInputCursor(text string, buf []cursorChar) inputCursor {
	// len(text) is an upper bound for the rune count
	if cap(buf) < len(text)+1 {
		buf = make([]cursorChar, 0, len(text)+1)
	}
	chars := buf[:0]
	for off, r := range text {
		chars = append(chars, cursorChar{r: r, off: off})
	}
	chars = append(chars, cursorChar{r: 0, off: len(text)})
	return inputCursor{chars: chars, text: text}
}

func (c *inputCursor) charCount() int {
	return len(c.chars) - 1
}

// peekAt returns the character at `index` (false if out of range).
func (c *inputCursor) peekAt(index int) (rune, bool) {
	if index < 0 || index >= len(c.chars)-1 {
		return 0, false
	}
	return c.chars[index].r, true
}

func (c *inputCursor) peek() (rune, bool) {
	return c.peekAt(c.pos)
}

// peekAtStr returns the character at `index` as a substring of the text (no allocation).
func (c *inputCursor) peekAtStr(index int) (string, bool) {
	if index < 0 || index >= len(c.chars)-1 {
		return "", false
	}
	return c.text[c.chars[index].off:c.chars[index+1].off], true
}

func (c *inputCursor) advance(units int) {
	c.pos += units
}

// slice returns the text of characters [start, end) as a substring ("" if out of range).
func (c *inputCursor) slice(start, end int) string {
	if start < 0 || start > end || end > c.charCount() {
		return ""
	}
	return c.text[c.chars[start].off:c.chars[end].off]
}

type peekAtFunc func(index int) (string, bool)

// matchPrevKramaSequence matches a sequence of krama items against previous context.
// `prev` contains krama indices; negative values never match.
func matchPrevKramaSequence(
	peekAt peekAtFunc,
	anchorIndex int,
	prev []int16,
	s *scriptdata.ScriptData,
) (matched bool, matchedLen int) {
	for i := 0; i < len(prev); i++ {
		expectedKrama := int(prev[len(prev)-1-i])
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

func isTaExtSuperscriptTail(r rune, ok bool) bool {
	return ok && (r == '²' || r == '³' || r == '⁴')
}

func isVedicSvaraTail(r rune, ok bool) bool {
	return ok && (r == '॒' || r == '॑' || r == '᳚' || r == '᳛')
}

func isScriptTamilExt(scriptName string) bool {
	return scriptName == "Tamil-Extended"
}

func isSkipChar(r rune) bool {
	switch r {
	case ' ', '\n', '\r', '\t', ',', '~', '!', '@', '?', '%':
		return true
	}
	return false
}

var vedicSvarasTypingSymbols = []string{"_", "'''", "''", "'"}
var vedicSvarasNormalSymbols = []string{"↓", "↑↑↑", "↑↑", "↑"}

// applyTypingInputAliases applies custom typing alias rules
//
// Eg. x -> kSh,
// Handling Vedic Svara input in tamil Extended
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
