package transliterate

import (
	"unicode/utf8"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/scriptdata"
)

// Tamil-Extended: an aspirated / voiced consonant is the Tamil consonant + a superscript number
// (க² is ख), and the writer puts the halant, the mAtrA and the Vedic svaras **before** the
// superscript (க்² is ख्, கி⁴ is घि). So going from it the superscript is read with the consonant
// before these, and going to it these are written before the superscript already in the result.

// taExtMatchWithSuperscript (Step 1, from Tamil-Extended): the match followed by a superscript
// that comes after a halant or a mAtrA and Vedic svaras, as the writer puts them before it:
// [halant | mAtrA | mAtrA mAtrA]? svara* superscript
//
// eg. க்² (ख्), கி⁴ (घि), கொ⁴ (घो as ெ + ா), க॒॑⁴ (घ॒॑), க்॒² (ख्॒), கி॒⁴ (घि॒), ரு॒॑² (ऋ॒॑)
//
// In the match the superscript takes the place of these, which are read next. On a match it sets
// `taExtSkipIndex` (the superscript, skipped when the cursor gets there) and
// `taExtSuperscriptDetached`.
//
//   - `nextChars`: the characters that can continue the current match
//   - `charToSearch`: the text of the current match, `endIndex` the index after it
//   - `nthCh`, `nthOk`: the character at `endIndex`
//
// It returns the index in the text to krama map of the match with the superscript, `-1` if this
// is not the case
func (ctx *transliterateCtx) taExtMatchWithSuperscript(
	nextChars []rune,
	charToSearch string,
	endIndex int,
	nthCh rune,
	nthOk bool,
) int {
	cursor := &ctx.cursor
	fromData := ctx.fromData
	supIndex := endIndex
	hasSign := nthOk && (runeIsStr(nthCh, fromData.Halant) || isMatraChar(fromData, nthCh))
	if hasSign {
		supIndex++
		// mAtrA duplicates like O = E + A in gEA (or gO as visible when)
		if c, ok := cursor.peekAt(supIndex); ok && isMatraChar(fromData, nthCh) && isMatraChar(fromData, c) {
			supIndex++
		}
	}
	svarasStart := supIndex
	for {
		c, ok := cursor.peekAt(supIndex)
		if !isVedicSvaraTail(c, ok) {
			break
		}
		supIndex++
	}
	supCh, supOk := cursor.peekAt(supIndex)
	if !(hasSign || supIndex > svarasStart) ||
		!isTaExtSuperscriptTail(supCh, supOk) || !containsRune(nextChars, supCh) ||
		// no superscript is being skipped, or (with only svaras in between) the
		// skipped one is inside this match: the ² of க்² in க்²ரு॑² (खृ॑)
		!(ctx.taExtSkipIndex == -1 || (!hasSign && ctx.taExtSkipIndex < endIndex)) {
		return -1
	}
	matchIndex := fromData.TextToKramaMapIndex(charToSearch+string(supCh), false)
	if matchIndex < 0 {
		return -1
	}
	// With only svaras in between, a superscript already skipped inside this
	// match (the ² of க்² in க்²ரு॑²) makes up for the one after the svaras in
	// the match length, so the whole match is advanced over.
	if !hasSign {
		ctx.taExtSuperscriptDetached = ctx.taExtSkipIndex == -1
	}
	ctx.taExtSkipIndex = supIndex
	return matchIndex
}

// taExtSplitBeforeHalantMatra (Step 1, from Tamil-Extended): the match ends with a halant, or a
// halant + a letter, that cannot be continued (ல் and ல்ர are the start of ல்ரி² ல்ரீ² (ऌ ॡ)), but
// the halant starts a mAtrA ending in a superscript (்ரு² ்ரூ² ்ல்ரி² ்ல்ரீ²): stop the match
// before the halant, so ல்ரு² is read as ல + ்ரு² (लृ) and ல்ல்ரி² as ல + ்ல்ரி² (लॢ, like
// க்ல்ரி² कॢ)
//
// It returns the index in the text to krama map of the text before the halant, `-1` if this is
// not the case
func (ctx *transliterateCtx) taExtSplitBeforeHalantMatra(
	nextChars []rune,
	charToSearch string,
	endIndex int,
	nthCh rune,
	nthOk bool,
) int {
	cursor := &ctx.cursor
	fromData := ctx.fromData
	halant := fromData.Halant
	tailStart, back := -1, 0
	if last, lastSize := utf8.DecodeLastRuneInString(charToSearch); lastSize > 0 && runeIsStr(last, halant) {
		tailStart, back = len(charToSearch)-lastSize, 1
	} else if beforeLast, size := utf8.DecodeLastRuneInString(charToSearch[:len(charToSearch)-lastSize]); size > 0 && runeIsStr(beforeLast, halant) {
		tailStart, back = len(charToSearch)-lastSize-size, 2
	}
	if !(tailStart > 0 && nthOk && !containsRune(nextChars, nthCh) && endIndex >= back &&
		cursor.slice(endIndex-back, endIndex) == charToSearch[tailStart:]) {
		return -1
	}
	// the longest text from the halant up to the superscript (after Vedic svaras)
	tail := charToSearch[tailStart:]
	tailEnd := endIndex
	for {
		c, ok := cursor.peekAt(tailEnd)
		if !ok || isTaExtSuperscriptTail(c, ok) || fromData.TextToKramaMapIndex(tail+string(c), false) < 0 {
			break
		}
		tail += string(c)
		tailEnd++
	}
	for {
		if c, ok := cursor.peekAt(tailEnd); !isVedicSvaraTail(c, ok) {
			break
		}
		tailEnd++
	}
	tailSup, ok := cursor.peekAt(tailEnd)
	if !ok || !isTaExtSuperscriptTail(tailSup, ok) {
		return -1
	}
	tailIsMatra := false
	if tailIndex := fromData.TextToKramaMapIndex(tail+string(tailSup), false); tailIndex >= 0 {
		tailKrama := fromData.TextToKramaMapArr[tailIndex].Value.Krama
		tailIsMatra = len(tailKrama) == 1 &&
			kramaListItem(fromData, int(tailKrama[0])).Kind() == scriptdata.ListKindMatra
	}
	if !tailIsMatra {
		return -1
	}
	return fromData.TextToKramaMapIndex(charToSearch[:tailStart], false)
}

// taExtUnconsumedSuperscriptUnits is the characters of the matched text that are not advanced
// over: `1` when it ends with a superscript that is not next to the rest of it in the input (it
// is skipped later, see `taExtSkipIndex`), else `0`.
//
// (only relevant while skipping a Tamil-Extended superscript; evaluated lazily)
func (ctx *transliterateCtx) taExtUnconsumedSuperscriptUnits(
	matchedText string,
	matchedCharCount int,
	m *scriptdata.TextToKramaMap,
) int {
	if ctx.taExtSuperscriptDetached {
		return 1
	}
	if ctx.taExtSkipIndex != -1 && matchedCharCount > 1 && len(m.Krama) > 0 &&
		kramaListItem(ctx.fromData, int(m.Krama[0])).Kind() == scriptdata.ListKindVyanjana {
		last, _ := utf8.DecodeLastRuneInString(matchedText)
		if isTaExtSuperscriptTail(last, true) {
			return 1
		}
	}
	return 0
}

// emitKramaAfterTaExtSuperscript (to Tamil-Extended, the result ends with a superscript) emits
// the texts of `krama`, a mAtrA / halant or a Vedic svara goes before the superscript.
func (ctx *transliterateCtx) emitKramaAfterTaExtSuperscript(krama []int16) {
	result := &ctx.result
	toData := ctx.toData
	// only this reorder path needs the pieces as a slice
	pieces := make([]string, 0, len(krama))
	for _, k := range krama {
		if k >= 0 {
			pieces = append(pieces, kramaTextOrEmpty(toData, int(k)))
		}
	}
	toHalant := toData.Halant
	if (len(pieces) == 1 && pieces[0] == toHalant) ||
		kramaListItem(toData, int(krama[len(krama)-1])).Kind() == scriptdata.ListKindMatra {
		result.emitPiecesWithReorder(pieces, toHalant, true)
	} else if len(pieces) > 0 && lastRuneIsVedicSvara(pieces[len(pieces)-1]) {
		last, _ := result.popLastChar()
		result.emitPieces(pieces)
		result.emitRune(last)
	} else {
		result.emitPieces(pieces)
	}
}

// emitPieceAfterTaExtSuperscript is emitKramaAfterTaExtSuperscript for the text of one krama
// index (Step 2).
func (ctx *transliterateCtx) emitPieceAfterTaExtSuperscript(kramaIndex int) {
	result := &ctx.result
	toData := ctx.toData
	piece := kramaTextOrEmpty(toData, kramaIndex)
	if piece == toData.Halant || kramaListItem(toData, kramaIndex).Kind() == scriptdata.ListKindMatra {
		result.emitPiecesWithReorder([]string{piece}, toData.Halant, true)
	} else if lastRuneIsVedicSvara(piece) {
		last, _ := result.popLastChar()
		result.emit(piece)
		result.emitRune(last)
	} else {
		result.emit(piece)
	}
}
