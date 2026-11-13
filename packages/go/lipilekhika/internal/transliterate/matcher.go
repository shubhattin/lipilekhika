package transliterate

import (
	"unicode/utf8"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/scriptdata"
)

// Step 1 of the transliteration: the entry of the text to krama map to read at a position.
//
// The map holds the texts of more than one character (and the ones that do not map to a single
// krama entry). Every entry lists the characters that can continue it (`next`), the scan follows
// them to the longest text. It does not back out of a longer text, the few cases where the
// longest text is not the one to read are handled here by name.

// signHasBase reports whether the text before `index` is a syllable that a sign written as a dead
// consonant (the Tamil anusvAra ம், see `DeadConsonantSignIndex`) can go with: a vyanjana (with
// its inherent vowel), a svara or a mAtrA, looking past Vedic svaras. Else (the start of a word,
// after a halant, a digit or a sign) it is the consonant + halant (ஸாத்ம்ய -> सात्म्य, not सात्ंय).
func signHasBase(s *scriptdata.ScriptData, cursor *inputCursor, index int) bool {
	end := index
	for end > 0 {
		if c, ok := cursor.peekAt(end - 1); !isVedicSvaraTail(c, ok) {
			break
		}
		end--
	}
	if end == 0 {
		return false
	}
	prev, ok := cursor.peekAt(end - 1)
	if !ok {
		return false
	}
	kramaIndex := kramaIndexOfChar(s, prev)
	if kramaIndex < 0 && end >= 2 {
		// a vowel sign or vowel written as its parts (ௌ as ெ + ௗ): the text of the last two
		if mapIndex := s.TextToKramaMapIndex(cursor.slice(end-2, end), false); mapIndex >= 0 {
			if krama := s.TextToKramaMapArr[mapIndex].Value.Krama; len(krama) > 0 {
				kramaIndex = int(krama[len(krama)-1])
			}
		}
	}
	switch kramaListItem(s, kramaIndex).Kind() {
	case scriptdata.ListKindVyanjana, scriptdata.ListKindSvara, scriptdata.ListKindMatra:
		return true
	}
	return false
}

// onlyReadInLongerText reports whether the character at `index` is not read by itself but starts a
// longer text that is, walking text_to_krama_map like Step 1. The Sinhala ZWJ + al-lakuna `‍්` is
// a halant, while the ZWJ by itself is a custom script character.
func onlyReadInLongerText(s *scriptdata.ScriptData, cursor *inputCursor, index int) bool {
	ch, ok := cursor.peekAt(index)
	if !ok {
		return false
	}
	mapIndex := s.TextToKramaMapCharIndex(ch, false)
	if kramaIndexOfChar(s, ch) >= 0 ||
		(mapIndex >= 0 && hasKramaOtherThanNeg1(s.TextToKramaMapArr[mapIndex].Value.Krama)) {
		return false
	}
	end := index + 1
	read := false
	for mapIndex >= 0 {
		c, ok := cursor.peekAt(end)
		if !ok || !containsRune(s.TextToKramaMapArr[mapIndex].Value.NextChars, c) {
			break
		}
		end++
		mapIndex = s.TextToKramaMapIndex(cursor.slice(index, end), false)
		if mapIndex >= 0 && hasKramaOtherThanNeg1(s.TextToKramaMapArr[mapIndex].Value.Krama) {
			read = true
		}
	}
	return read
}

// scanText is the text from `textIndex` to `endIndex` that is searched in the map. While a
// Tamil-Extended superscript is being skipped (`taExtSkipIndex`) it is left out of it.
func (ctx *transliterateCtx) scanText(textIndex, endIndex int) string {
	skipIndex := ctx.taExtSkipIndex
	if skipIndex == -1 {
		return ctx.cursor.slice(textIndex, endIndex)
	}
	text := ctx.cursor.slice(textIndex, skipIndex)
	if endIndex > skipIndex {
		text += ctx.cursor.slice(skipIndex+1, endIndex)
	}
	return text
}

// nfdSplitBeforeMarkedLetter: Decomposed (NFD) text, a letter is its base + combining marks (ī is
// i + U+0304), and the base can continue the letter before it (a + i is ai, k + h is kh). When
// the match cannot take the mark after it but its last letter can, the match stops before that
// letter: kaī is k a ī (कई), not kai + U+0304
//
// It returns the index in the map of the match without its last letter, `-1` if this is not the
// case
func (ctx *transliterateCtx) nfdSplitBeforeMarkedLetter(matchIndex, textIndex, endIndex int) int {
	cursor := &ctx.cursor
	mark, ok := cursor.peekAt(endIndex)
	if !ok || !isLatinCombiningMark(mark) ||
		containsRune(ctx.textToKramaMap[matchIndex].Value.NextChars, mark) {
		return -1
	}
	last, ok := cursor.peekAt(endIndex - 1)
	if !ok {
		return -1
	}
	headIndex := ctx.lookupData.TextToKramaMapIndex(cursor.slice(textIndex, endIndex-1), ctx.useTypingMap)
	if headIndex < 0 {
		return -1
	}
	if !isFullyReadKrama(ctx.textToKramaMap[headIndex].Value.Krama) ||
		ctx.lookupData.TextToKramaMapIndex(string(last)+string(mark), ctx.useTypingMap) < 0 {
		return -1
	}
	return headIndex
}

// scanLongestMatch follows the `next` characters of the entries of the map to the longest text at
// `textIndex`, where the character is `ch`.
//
// It returns the index in `ctx.textToKramaMap`, `-1` if no match
func (ctx *transliterateCtx) scanLongestMatch(ch rune, textIndex int) int {
	cursor := &ctx.cursor
	lookupData, useTypingMap := ctx.lookupData, ctx.useTypingMap
	scanUnits := 0
	lastValidVowelMatchIndex := -1
	checkVowelRetraction := ctx.mode == modeOtherToBrahmic && ctx.prevEndsWithVyanjana()

	for {
		if ctx.taExtSkipIndex != -1 && isTaExtSuperscriptTail(cursor.peekAt(textIndex+scanUnits+1)) {
			scanUnits++ // each char is 1 unit
		}

		endIndex := textIndex + scanUnits + 1
		singleCharLookup := scanUnits == 0 && ctx.taExtSkipIndex == -1
		// The single-char fast path never reads `charToSearch` unless the match
		// has a `next` list, so build the slice lazily.
		charToSearch := ""
		var matchIndex int
		if singleCharLookup {
			// more scan units only needed in case ta-ext so safe to do
			matchIndex = lookupData.TextToKramaMapCharIndex(ch, useTypingMap)
		} else {
			charToSearch = ctx.scanText(textIndex, endIndex)
			matchIndex = lookupData.TextToKramaMapIndex(charToSearch, useTypingMap)
		}
		if matchIndex < 0 {
			return -1
		}
		potentialMatch := &ctx.textToKramaMap[matchIndex].Value

		// vowel retraction support (kAUM etc.)
		if checkVowelRetraction && len(potentialMatch.Krama) > 0 {
			kramaID := potentialMatch.Krama[0]
			if kramaID >= 0 {
				kind := kramaListItem(ctx.toData, int(kramaID)).Kind()
				isSingleVowel := len(potentialMatch.Krama) == 1 &&
					(kind == scriptdata.ListKindSvara || kind == scriptdata.ListKindMatra)
				if isSingleVowel {
					lastValidVowelMatchIndex = matchIndex
				} else if lastValidVowelMatchIndex >= 0 {
					return lastValidVowelMatchIndex
				}
			}
		}

		// extend match if `next` allows it
		nextChars := potentialMatch.NextChars
		if len(nextChars) > 0 {
			nthCh, nthOk := cursor.peekAt(endIndex)

			// Tamil-Extended special handling (superscript numbers after matra/halant/svara)
			if ctx.isFromTamilExt && ctx.fromData.ScriptType == scriptdata.ScriptTypeBrahmic {
				if singleCharLookup {
					charToSearch = cursor.slice(textIndex, endIndex)
				}
				taExtIndex := ctx.taExtMatchWithSuperscript(nextChars, charToSearch, endIndex, nthCh, nthOk)
				if taExtIndex < 0 {
					taExtIndex = ctx.taExtSplitBeforeHalantMatra(nextChars, charToSearch, endIndex, nthCh, nthOk)
				}
				if taExtIndex >= 0 {
					return taExtIndex
				}
			}

			// Generic: if the next character is in the next list, extend scan and continue
			if nthOk && containsRune(nextChars, nthCh) {
				scanUnits++ // each char is 1 unit
				continue
			}
		}

		if scanUnits > 0 && ctx.taExtSkipIndex == -1 && ctx.fromIsOther {
			if headIndex := ctx.nfdSplitBeforeMarkedLetter(matchIndex, textIndex, endIndex); headIndex >= 0 {
				return headIndex
			}
		}
		return matchIndex
	}
}

// isDeadConsonantSignWithoutBase: a sign written as a dead consonant (Tamil anusvAra ம்) with no
// syllable to go with (the start of a word, after a halant), only the consonant is read (in
// Step 2), the halant next
func (ctx *transliterateCtx) isDeadConsonantSignWithoutBase(matchIndex, textIndex int) bool {
	return matchIndex == ctx.fromData.DeadConsonantSignIndex && !ctx.useTypingMap &&
		!signHasBase(ctx.fromData, &ctx.cursor, textIndex)
}

// splitOmInsideWord: ॐ inside a word (after a letter) is read as the letters of its text, the
// longest part of it which is read: IAST logoṃ is लोगों, SLP1 jAUM जाऊं (to a brahmic script the
// same is done after a vyanjana, the vowel retraction)
//
// It returns the index in the map of that part, `matchIndex` if the match is not ॐ inside a word
func (ctx *transliterateCtx) splitOmInsideWord(matchIndex, textIndex int) int {
	if textIndex <= 0 {
		return matchIndex
	}
	if prev, ok := ctx.cursor.peekAt(textIndex - 1); !ok || !isWordRune(prev) {
		return matchIndex
	}
	if krama := ctx.textToKramaMap[matchIndex].Value.Krama; len(krama) != 1 || krama[0] != omKramaIndex {
		return matchIndex
	}
	matched := ctx.textToKramaMap[matchIndex].Text
	for end := len(matched) - 1; end > 0; end-- {
		if !utf8.RuneStart(matched[end]) {
			continue
		}
		index := ctx.lookupData.TextToKramaMapIndex(matched[:end], ctx.useTypingMap)
		if index < 0 {
			continue
		}
		if isFullyReadKrama(ctx.textToKramaMap[index].Value.Krama) {
			return index
		}
	}
	return matchIndex
}

// matchTextToKrama is Step 1: match text_to_krama_map / typing_text_to_krama_map
//
// It can set `taExtSkipIndex` and `taExtSuperscriptDetached` (from Tamil-Extended).
//
// (the Tamil-Extended matches index into `fromData.TextToKramaMapArr`, which is
// `ctx.textToKramaMap` as the typing map is only used with `Normal` as the input)
//
// `ch` is the character at `textIndex`. It returns the index in `ctx.textToKramaMap`, `-1` if no
// match
func (ctx *transliterateCtx) matchTextToKrama(ch rune, textIndex int) int {
	ctx.taExtSuperscriptDetached = false
	matchIndex := ctx.scanLongestMatch(ch, textIndex)
	if matchIndex < 0 {
		return -1
	}
	if ctx.isDeadConsonantSignWithoutBase(matchIndex, textIndex) {
		return -1
	}
	if ctx.omOnlyAtWordStart {
		return ctx.splitOmInsideWord(matchIndex, textIndex)
	}
	return matchIndex
}
