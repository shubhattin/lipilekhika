// Package transliterate is the transliteration core.
//
// TransliterateTextCoreWith reads the input once, character by character:
//
//  1. The input is prepared: the typing aliases, then the custom rules that are a plain replace
//     on the input (applyCustomReplaceRules).
//  2. A character that is copied as it is (space, punctuation, an ASCII digit when native
//     numerals are off, a preserved custom character) is emitted and the loop goes on.
//  3. Step 1 (matcher.go): the longest text of the text to krama map at this position.
//     emitMatch writes its krama in the target script.
//  4. Step 2 (emitKramaChar): a character without a match (or a match without a krama of its
//     own) is looked up in the krama array directly. An unknown character is copied.
//  5. Before every item is written prevContextCleanup (context.go) looks at the last items
//     (prevCtx): between a brahmic and an `other` script the inherent vowel, the halant and the
//     mAtrA form of a vowel depend on what came before (contextMode).
//  6. After every match the custom rules of the enabled options are applied on the end of the
//     result (custom_rules.go), and at the end the ones that are a plain replace on the output.
//
// Tamil-Extended has its own handling in Step 1 and when writing (tamil_ext.go).
package transliterate

import (
	"fmt"
	"unicode/utf8"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/scriptdata"
)

const (
	defaultUseNativeNum         = true
	defaultIncludeInherentVowel = false
)

// Options holds transliteration options.
type Options struct {
	TypingMode           bool
	UseNativeNumerals    bool
	IncludeInherentVowel bool
}

// TransliterateOutput holds the transliteration result.
type TransliterateOutput struct {
	Output        string
	ContextLength int
}

// TransliterateScratch holds buffers reused across calls, so repeated calls (typing mode
// re-transliterates the context on every key) avoid per-call allocations.
// The zero value is ready to use. Not safe for concurrent use.
type TransliterateScratch struct {
	// char table of the input (see `inputCursor`)
	chars []cursorChar
	// output buffer
	out []byte
}

// skipConsumedTaExtSuperscript skips the superscript of a Tamil-Extended match that was read with
// it (see `taExtSkipIndex`)
func (ctx *transliterateCtx) skipConsumedTaExtSuperscript(textIndex int) bool {
	if ctx.taExtSkipIndex == -1 || textIndex < ctx.taExtSkipIndex {
		return false
	}
	ctx.taExtSkipIndex = -1
	ctx.cursor.advance(1)
	return true
}

// emitSkipChar: skip certain chars (preserve as-is), they also end the context
func (ctx *transliterateCtx) emitSkipChar(ch rune) {
	ctx.cursor.advance(1)
	if ctx.mode != modeNone {
		ctx.prevContextCleanup(" ", nil, nil)
		ctx.prevCtx.clear()
	}
	ctx.result.emitRune(ch)
}

// emitASCIIDigit: latin digits passthrough if native numerals disabled
func (ctx *transliterateCtx) emitASCIIDigit(ch rune, textIndex int) {
	ctx.cursor.advance(1)
	digit, _ := ctx.cursor.peekAtStr(textIndex)
	// cleanup first, so a pending halant/schwa goes before the digit (k0 -> क्0)
	ctx.prevContextCleanup(digit, nil, nil)
	ctx.result.emitRune(ch)
}

// emitPreservedCustomChar is the preserve mode: custom script chars when converting to Normal
// (unless it starts a longer text, the Sinhala ZWJ + al-lakuna `‍්` is a halant)
//
// It returns `true` when the character was a custom script character (written as its Normal key)
func (ctx *transliterateCtx) emitPreservedCustomChar(textIndex int) bool {
	fromData := ctx.fromData
	chStr, _ := ctx.cursor.peekAtStr(textIndex)
	idx, ok := fromData.CustomScriptCharsLookup[chStr]
	if !ok || onlyReadInLongerText(fromData, &ctx.cursor, textIndex) {
		return false
	}
	item := &fromData.CustomScriptCharsArr[idx]
	var listItem *scriptdata.ListItem
	if item.FirstRef != nil {
		listItem = listItemAt(fromData, int(*item.FirstRef))
	}
	ctx.prevContextCleanup(item.Text, listItem, nil)
	normalText := ""
	if item.SecondRef != nil {
		si := int(*item.SecondRef)
		if si >= 0 && si < len(fromData.TypingTextToKramaMapArr) {
			normalText = fromData.TypingTextToKramaMapArr[si].Text
		}
	}
	ctx.result.emit(normalText)
	ctx.cursor.advance(utf8.RuneCountInString(item.Text))
	return true
}

// mayBePassthroughChar is the cheap test before emitPassthroughChar (small enough to be inlined
// into the loop, so a letter costs no call here)
func (ctx *transliterateCtx) mayBePassthroughChar(ch rune) bool {
	return isSkipChar(ch) || (ch >= '0' && ch <= '9') || ctx.preserveSpecificChars
}

// emitPassthroughChar handles the characters that are copied as they are (not looked up in the
// script data).
//
// It returns `true` when the character was one of them (it is emitted and advanced over)
func (ctx *transliterateCtx) emitPassthroughChar(ch rune, textIndex int) bool {
	if isSkipChar(ch) && !(ch == '~' && ctx.tildeIsText) {
		ctx.emitSkipChar(ch)
		return true
	}
	if ch >= '0' && ch <= '9' && !ctx.useNativeNumerals {
		ctx.emitASCIIDigit(ch, textIndex)
		return true
	}
	return ctx.preserveSpecificChars && ctx.emitPreservedCustomChar(textIndex)
}

// emitTypingCustomChar: a key of the typing map that is a custom script character of the target
// script
func (ctx *transliterateCtx) emitTypingCustomChar(matchedText string, m *scriptdata.TextToKramaMap) {
	toData := ctx.toData
	customItem := &toData.CustomScriptCharsArr[*m.CustomBackRef]
	var listItem *scriptdata.ListItem
	if customItem.FirstRef != nil {
		listItem = listItemAt(toData, int(*customItem.FirstRef))
	}
	// cleanup first, so a pending halant goes before the custom character
	// (kqq -> क्q, k.qSha -> क्‍ष)
	// custom characters are never svara/mAtrA, so cleanup never emits them itself
	ctx.prevContextCleanup(matchedText, listItem, m.Next)
	ctx.result.emit(customItem.Text)
}

// sourceListItemOfMatch (brahmic -> other) is the list item (type info) that stands for a match
// of the brahmic text
func (ctx *transliterateCtx) sourceListItemOfMatch(m *scriptdata.TextToKramaMap, krama []int16) *scriptdata.ListItem {
	fromData := ctx.fromData
	// pick a brahmic list item (from-script) if available
	var item *scriptdata.ListItem
	if m.FallbackListRef != nil && !ctx.useTypingChars {
		item = listItemAt(fromData, int(*m.FallbackListRef))
	}
	if item != nil || len(krama) == 0 {
		return item
	}
	if ctx.isFromTamilExt {
		// a mixture of vyanjana and mAtrA is an anya
		if anyKramaKind(fromData, krama, scriptdata.ListKindMatra) &&
			anyKramaKind(fromData, krama, scriptdata.ListKindVyanjana) {
			return &scriptdata.AnyaListItem
		}
		if len(krama) > 1 && anyKramaKind(fromData, krama, scriptdata.ListKindNone) {
			return kramaListItem(fromData, int(krama[len(krama)-1]))
		}
	}
	return kramaListItem(fromData, int(krama[0]))
}

// updateContextForBrahmicTarget (other -> brahmic) is the context update for a match, the item
// is of the brahmic target
func (ctx *transliterateCtx) updateContextForBrahmicTarget(
	matchedText string,
	m *scriptdata.TextToKramaMap,
	krama []int16,
) bool {
	toData := ctx.toData
	var item *scriptdata.ListItem
	if m.FallbackListRef != nil {
		item = listItemAt(toData, int(*m.FallbackListRef))
	} else if len(krama) > 0 {
		item = kramaListItem(toData, int(krama[0]))
	}
	typingFromNormal := ctx.typingMode && ctx.fromName == "Normal"
	var next []string
	if typingFromNormal {
		next = m.Next
	}
	// The halant typed by its own key (`.h`) is passed as the halant itself, so
	// that the cleanup does not add a second one after a vyanjana
	// (k.h -> क्, not क््)
	itemText := contextTextOfMatch(toData, krama, matchedText, ctx.brahmicHalant)
	emitsTaExtSuperscriptTail := false
	if typingFromNormal && ctx.isToTamilExt {
		last, size := utf8.DecodeLastRuneInString(kramaTextOrEmpty(toData, int(krama[len(krama)-1])))
		emitsTaExtSuperscriptTail = isTaExtSuperscriptTail(last, size > 0)
	}
	return ctx.prevContextCleanupExt(itemText, item, next, emitsTaExtSuperscriptTail)
}

// updateContextForMatch is the context update for a match with a krama, by the mode.
//
// It returns `true` when the cleanup already wrote the item (as the mAtrA of the vyanjana before)
func (ctx *transliterateCtx) updateContextForMatch(
	matchedText string,
	m *scriptdata.TextToKramaMap,
	krama []int16,
) bool {
	switch ctx.mode {
	case modeBrahmicToOther:
		// A halant variant matched as a whole (Sinhala al-lakuna + ZWJ `්‍`) is
		// passed as the halant itself, so that the cleanup does not add an inherent
		// vowel before it (ක්‍ෂ -> kSha, not kaSha)
		itemText := contextTextOfMatch(ctx.fromData, krama, matchedText, ctx.brahmicHalant)
		return ctx.prevContextCleanup(itemText, ctx.sourceListItemOfMatch(m, krama), nil)
	case modeOtherToBrahmic:
		return ctx.updateContextForBrahmicTarget(matchedText, m, krama)
	case modeTypingToOther:
		return ctx.prevContextCleanup(matchedText, nil, m.Next)
	}
	return false
}

// emitKramaWithInMatchRules emits the krama piece by piece, the rules that can apply inside a
// match see every piece of it, not only the last: Romanized sh (स्ह) -> ස්‍හ with the Sinhala
// conjunct ZWJ, Sinhala ඟ (ङ्ग) -> nga, or -> ंग with the anusvAra option
func (ctx *transliterateCtx) emitKramaWithInMatchRules(krama []int16, matchStart int) {
	for i, k := range krama {
		if k < 0 {
			continue
		}
		piece := kramaTextOrEmpty(ctx.toData, int(k))
		ctx.result.emit(piece)
		if piece != "" && i+1 < len(krama) {
			ctx.applyCustomTransRules(matchStart, ctx.cursor.pos, krama[:i+1], &krama[i+1])
		}
	}
}

// emitMatchKrama: a match with a krama (at least one entry is not `-1`), emitted directly
func (ctx *transliterateCtx) emitMatchKrama(
	matchedText string,
	m *scriptdata.TextToKramaMap,
	krama []int16,
	matchStart int,
) {
	// prev-context bookkeeping
	resultConcat := ctx.updateContextForMatch(matchedText, m, krama)
	if !resultConcat {
		// Tamil-Extended output reorder (matra/halant after superscript)
		if ctx.toData.ScriptType == scriptdata.ScriptTypeBrahmic && ctx.resultEndsWithTaExtSuperscript() {
			ctx.emitKramaAfterTaExtSuperscript(krama)
		} else if ctx.hasInMatchRules && len(krama) > 1 {
			ctx.emitKramaWithInMatchRules(krama, matchStart)
		} else {
			emitKramaPieces(&ctx.result, ctx.toData, krama)
		}
	}
	if len(ctx.customRules) > 0 {
		ctx.applyCustomTransRules(matchStart, ctx.cursor.pos, krama, nil)
	}
}

// emitPrefixOnlyMatch: krama contains -1 entries, emit raw match
// (prefix-only entries like `c` of `ch` or `S` of `Sh`)
func (ctx *transliterateCtx) emitPrefixOnlyMatch(matchedText string, next []string) {
	// cleanup first, so a pending halant goes before the text (kc -> क्c)
	if ctx.typingMode {
		ctx.prevContextCleanup(matchedText, nil, next)
	} else if ctx.mode != modeNone {
		// like an unknown character (see Step 2), `kca` -> क्cअ
		ctx.prevContextCleanup(matchedText, nil, nil)
		ctx.prevCtx.clear()
	}
	ctx.result.emit(matchedText)
}

// emitMatch writes the match of Step 1 and advances over it. The cursor is on the first character
// of the match, `ch`.
//
// It returns `false` when the entry has no krama of its own: its text is read in Step 2
//
// `superscriptDetached`: see taExtMatchWithSuperscript
func (ctx *transliterateCtx) emitMatch(matchIndex int, ch rune, superscriptDetached bool) bool {
	entry := &ctx.textToKramaMap[matchIndex]
	matchedText := entry.Text
	m := &entry.Value
	matchStart := ctx.cursor.pos
	// a match always starts at `ch`, so equal byte length means it is exactly `ch`
	matchedCharCount := 1
	if len(matchedText) != utf8.RuneLen(ch) {
		matchedCharCount = utf8.RuneCountInString(matchedText)
	}
	ctx.cursor.advance(matchedCharCount - ctx.taExtUnconsumedSuperscriptUnits(superscriptDetached, matchedText, matchedCharCount, m))

	if ctx.useTypingChars && m.CustomBackRef != nil &&
		*m.CustomBackRef >= 0 && int(*m.CustomBackRef) < len(ctx.toData.CustomScriptCharsArr) {
		ctx.emitTypingCustomChar(matchedText, m)
		return true
	}

	krama := m.Krama
	// If krama exists and has at least one non -1, emit directly
	if hasKramaOtherThanNeg1(krama) {
		ctx.emitMatchKrama(matchedText, m, krama, matchStart)
		return true
	}
	if containsI16(krama, -1) {
		ctx.emitPrefixOnlyMatch(matchedText, m.Next)
		return true
	}
	return false
}

// emitUnknownChar: text not matched so ignore and return as it is
func (ctx *transliterateCtx) emitUnknownChar(text string) {
	// A ZWJ / ZWNJ only changes how a Brahmic text is shown (a conjunct, half form or the
	// eyelash ra र‍्), it is not written in Normal / Romanized and does not end the
	// syllable: क्‍ष and क‍्ष are kSha (were k‍Sha and ka‍Sha)
	if ctx.mode == modeBrahmicToOther && (runeIsStr(zwjRune, text) || runeIsStr(zwnjRune, text)) {
		return
	}
	if ctx.mode != modeNone {
		ctx.prevContextCleanup(text, nil, nil)
		ctx.prevCtx.clear()
	}
	ctx.result.emit(text)
}

// updateContextForKramaChar is the context update for the krama entry `index` read in Step 2, by
// the mode
func (ctx *transliterateCtx) updateContextForKramaChar(text string, index int, next []string) bool {
	switch ctx.mode {
	case modeBrahmicToOther:
		return ctx.prevContextCleanup(text, kramaListItem(ctx.fromData, index), nil)
	case modeOtherToBrahmic:
		return ctx.prevContextCleanup(text, kramaListItem(ctx.toData, index), nil)
	case modeTypingToOther:
		// Typing into an `other` script: a key with no krama in the typing map (Romanized
		// `sh` / `ch`, prefixes of `shh` / `sh^` / `chh`) is resolved here. Pass its `next`
		// as in Step 1, so the context is kept while more keys can follow (else `shh` at
		// the start of a word comes out as `śh`), and cleared like in Step 1 when none can.
		ctx.prevContextCleanup(text, nil, next)
	}
	return false
}

// emitKramaChar is Step 2: Search in krama_text_arr
//
// The cursor is already after the character `ch` (or after the match without krama, `matchIndex`).
func (ctx *transliterateCtx) emitKramaChar(ch rune, matchIndex int) {
	var charToSearch string
	var index int
	var next []string
	if matchIndex < 0 {
		// pos - 1 as the fallback consumed (advanced 1) the previous character
		charToSearch, _ = ctx.cursor.peekAtStr(ctx.cursor.pos - 1)
		index = kramaIndexOfChar(ctx.fromData, ch) // no string lookup needed
	} else {
		entry := &ctx.textToKramaMap[matchIndex]
		charToSearch = entry.Text
		next = entry.Value.Next
		index = kramaIndexOfText(ctx.fromData, charToSearch)
	}
	if index < 0 {
		ctx.emitUnknownChar(charToSearch)
		return
	}

	resultConcat := ctx.updateContextForKramaChar(charToSearch, index, next)
	if !resultConcat {
		if ctx.toData.ScriptType == scriptdata.ScriptTypeBrahmic && ctx.resultEndsWithTaExtSuperscript() {
			ctx.emitPieceAfterTaExtSuperscript(index)
		} else {
			ctx.result.emit(kramaTextOrEmpty(ctx.toData, index))
		}
	}

	// (the start given to the rules is one character before the cursor, as it always was: for a
	// match of several characters without krama that is not the start of the match)
	if len(ctx.customRules) > 0 {
		pos := ctx.cursor.pos
		ctx.applyCustomTransRules(pos-1, pos, []int16{int16(index)}, nil)
	}
}

// TransliterateTextCore is the synchronous core transliterator.
func TransliterateTextCore(
	text string,
	fromName, toName string,
	fromData, toData *scriptdata.ScriptData,
	transOptions map[string]bool,
	customRules []scriptdata.Rule,
	opts *Options,
) (TransliterateOutput, error) {
	return TransliterateTextCoreWith(text, fromName, toName, fromData, toData, transOptions, customRules, opts, nil)
}

// TransliterateTextCoreWith is TransliterateTextCore taking its working buffers from
// `scratch` (nil allocates fresh buffers).
func TransliterateTextCoreWith(
	text string,
	fromName, toName string,
	fromData, toData *scriptdata.ScriptData,
	transOptions map[string]bool,
	customRules []scriptdata.Rule,
	opts *Options,
	scratch *TransliterateScratch,
) (TransliterateOutput, error) {
	if opts == nil {
		opts = &Options{
			UseNativeNumerals:    defaultUseNativeNum,
			IncludeInherentVowel: defaultIncludeInherentVowel,
		}
	}
	if opts.TypingMode && fromName != "Normal" {
		return TransliterateOutput{}, &TransliterateError{Msg: "typing mode requires Normal as from script"}
	}

	if opts.TypingMode && fromName == "Normal" {
		text = applyTypingInputAliases(text, toName)
	}
	if len(customRules) > 0 {
		text = applyCustomReplaceRules(text, fromData, customRules, scriptdata.CheckInInput)
	}

	var ctx transliterateCtx
	ctx.init(text, fromName, toName, fromData, toData, transOptions, customRules, opts, scratch)
	cursor := &ctx.cursor

	charsLen := cursor.charCount()
	for cursor.pos < charsLen {
		textIndex := cursor.pos
		ch, ok := cursor.peek()
		if !ok {
			break
		}

		if ctx.skipConsumedTaExtSuperscript(textIndex) {
			continue
		}
		if ctx.mayBePassthroughChar(ch) && ctx.emitPassthroughChar(ch, textIndex) {
			continue
		}

		// Step 1: match text_to_krama_map / typing_text_to_krama_map
		matchIndex, supIndex, supDetached := ctx.matchTextToKrama(ch, textIndex)
		// a Tamil-Extended superscript read with the match is skipped when the cursor gets there
		if supIndex >= 0 {
			ctx.taExtSkipIndex = supIndex
		}
		if matchIndex >= 0 {
			if ctx.emitMatch(matchIndex, ch, supDetached) {
				continue
			}
		} else {
			cursor.advance(1)
		}

		// Step 2: Search in krama_text_arr
		ctx.emitKramaChar(ch, matchIndex)
	}
	// the inherent vowel / halant of a last vyanjana
	ctx.flushPrevContext()

	contextLength := ctx.prevCtx.length()
	output := string(ctx.result.buf)
	if scratch != nil {
		// hand the buffers back for reuse (`output` is a copy, so reusing `out` is safe)
		scratch.chars, scratch.out = ctx.cursor.chars, ctx.result.buf
	}
	if len(customRules) > 0 {
		output = applyCustomReplaceRules(output, toData, customRules, scriptdata.CheckInOutput)
	}
	return TransliterateOutput{Output: output, ContextLength: contextLength}, nil
}

// TransliterateError represents a transliteration error.
type TransliterateError struct {
	Msg string
}

func (e *TransliterateError) Error() string {
	return e.Msg
}

// Transliterate transliterates text from fromScript to toScript.
// transOptions can be nil. Returns the transliterated string or an error.
func Transliterate(
	text string,
	fromScript, toScript string,
	transOptions map[string]bool,
) (string, error) {
	fromNorm, err := scriptdata.GetNormalizedScriptName(fromScript)
	if err != nil {
		return "", err
	}
	toNorm, err := scriptdata.GetNormalizedScriptName(toScript)
	if err != nil {
		return "", err
	}
	customOpts, err := scriptdata.GetCustomOptionsMap()
	if err != nil {
		return "", err
	}
	// unknown keys are rejected, like in the Rust based bindings (WASM, N-API, Python, Dart)
	for key := range transOptions {
		if _, ok := customOpts[key]; !ok {
			return "", fmt.Errorf("unknown trans_options key: %s", key)
		}
	}
	if fromNorm == toNorm {
		return text, nil
	}
	fromData, err := scriptdata.GetScriptData(fromNorm)
	if err != nil {
		return "", err
	}
	toData, err := scriptdata.GetScriptData(toNorm)
	if err != nil {
		return "", err
	}
	// Keep only the custom options active for this script pair and flatten the rules of the
	// enabled ones into one list: the core reads these, not the input options.
	resolved := resolveTransliterationRules(fromData, toData, customOpts, transOptions)
	activeResolvedTransOptions, resolvedCustomRules := resolved.TransOptions, resolved.CustomRules
	out, err := TransliterateTextCore(
		text, fromNorm, toNorm,
		fromData, toData,
		activeResolvedTransOptions, resolvedCustomRules,
		nil,
	)
	if err != nil {
		return "", err
	}
	return out.Output, nil
}
