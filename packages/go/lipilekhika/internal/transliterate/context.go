package transliterate

import (
	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/scriptdata"
)

// contextMode is how the previous context (`prevCtx`) is used, from the types of the two
// scripts. It is in use in every mode but `modeNone`.
type contextMode uint8

const (
	// brahmic -> brahmic, or other -> other without typing: no context
	modeNone contextMode = iota
	// the inherent vowel (schwa) is written after a vyanjana
	modeBrahmicToOther
	// a vowel after a vyanjana is its mAtrA, a vyanjana without a vowel takes the halant
	modeOtherToBrahmic
	// typing (`Normal`) into an `other` script: only the length of the context is used
	modeTypingToOther
)

// transliterateCtx is everything a transliteration call works with: the data, the options
// resolved once, and the state of the pass over the input
type transliterateCtx struct {
	fromName, toName string
	fromData, toData *scriptdata.ScriptData
	customRules      []scriptdata.Rule
	cursor           inputCursor
	result           resultStringBuilder
	// The last items read (their text in the input and the type of the brahmic script)
	prevCtx prevContextBuilder
	mode    contextMode
	// halant of the brahmic script of the pair
	brahmicHalant string
	// nuqta of the brahmic script of the pair (`hasNuqta` is false if it has none)
	brahmicNuqta         string
	hasNuqta             bool
	typingMode           bool
	includeInherentVowel bool
	useNativeNumerals    bool
	isFromTamilExt       bool
	isToTamilExt         bool
	// typing mode, or the `normal_to_all:use_typing_chars` option
	useTypingChars bool
	// the typing map of the target script is used (`Normal` as the input)
	useTypingMap bool
	// the script data whose (typing) text to krama map is looked up
	lookupData *scriptdata.ScriptData
	// The map whose indices the lookups (`TextToKramaMapIndex`, ...) return
	textToKramaMap []scriptdata.TextMapEntry
	fromIsOther    bool
	// `~` is a letter in some romanization schemes (Harvard-Kyoto candrabindu, ITRANS `~N`),
	// there it is read instead of skipped
	tildeIsText bool
	// Between two romanizations, one of them a standard scheme, ॐ is read only at the start of a
	// word (there is no vyanjana context to tell `logoṃ` लोगों from ॐ). Normal and Romanized are
	// kept as they were.
	omOnlyAtWordStart bool
	// the `all_to_normal:preserve_specific_chars` option, to `Normal`
	preserveSpecificChars bool
	// `direct_replace` and input side `replace_prev_krama_keys` rules are applied after every
	// piece of a match
	hasInMatchRules bool
	// the `all_to_sinhala:use_conjunct_enabling_halant` option, to `Sinhala`
	sinhalaConjunctHalant bool
	// Index of a Tamil-Extended superscript that was read with the match before it (a halant, a
	// mAtrA or Vedic svaras are written in between), to be skipped when the cursor gets there.
	// `-1` if none. Used when converting from Tamil-Extended
	taExtSkipIndex int
	// the matched text ends with a Tamil-Extended superscript that is not next to the rest of
	// it in the input (a Vedic svara is in between), so it is not to be advanced over
	taExtSuperscriptDetached bool
}

// init sets up the context for a call. `text` is the prepared input (typing aliases and the
// input replace rules applied), `scratch` gives the working buffers (nil allocates fresh ones).
func (ctx *transliterateCtx) init(
	text string,
	fromName, toName string,
	fromData, toData *scriptdata.ScriptData,
	transOptions map[string]bool,
	customRules []scriptdata.Rule,
	opts *Options,
	scratch *TransliterateScratch,
) {
	fromBrahmic := fromData.ScriptType == scriptdata.ScriptTypeBrahmic
	toBrahmic := toData.ScriptType == scriptdata.ScriptTypeBrahmic
	fromOther := fromData.ScriptType == scriptdata.ScriptTypeOther
	toOther := toData.ScriptType == scriptdata.ScriptTypeOther

	ctx.fromName, ctx.toName = fromName, toName
	ctx.fromData, ctx.toData = fromData, toData
	ctx.customRules = customRules
	ctx.typingMode = opts.TypingMode
	// the custom options turn these on too (the typing context passes them as `opts`)
	ctx.useNativeNumerals = opts.UseNativeNumerals && !transOpt(transOptions, optKeepASCIINumerals)
	ctx.includeInherentVowel = opts.IncludeInherentVowel || transOpt(transOptions, optIncludeInherentVowel)
	ctx.isFromTamilExt = isScriptTamilExt(fromName)
	ctx.isToTamilExt = isScriptTamilExt(toName)
	// option flags resolved once (nil-map reads return false)
	ctx.preserveSpecificChars = transOpt(transOptions, optPreserveSpecificChars) && toName == "Normal"
	ctx.sinhalaConjunctHalant = toName == "Sinhala" && transOpt(transOptions, optSinhalaConjunctHalant)

	switch {
	case fromBrahmic && toOther:
		ctx.mode = modeBrahmicToOther
		ctx.brahmicHalant = fromData.Halant
		if fromData.Nuqta != nil {
			ctx.brahmicNuqta, ctx.hasNuqta = *fromData.Nuqta, true
		}
	case fromOther && toBrahmic:
		ctx.mode = modeOtherToBrahmic
		ctx.brahmicHalant = toData.Halant
		if toData.Nuqta != nil {
			ctx.brahmicNuqta, ctx.hasNuqta = *toData.Nuqta, true
		}
	case opts.TypingMode && fromName == "Normal" && toOther:
		ctx.mode = modeTypingToOther
	}
	ctx.fromIsOther = fromOther
	ctx.omOnlyAtWordStart = fromOther && toOther &&
		(isStandardScheme(fromName) || isStandardScheme(toName))

	for i := range customRules {
		r := &customRules[i]
		if (r.UseReplace == nil || !*r.UseReplace) &&
			(r.Type == "direct_replace" || (r.Type == "replace_prev_krama_keys" && !ruleChecksOutput(r))) {
			ctx.hasInMatchRules = true
			break
		}
	}

	// choose matching map
	ctx.useTypingChars = opts.TypingMode || transOpt(transOptions, optUseTypingChars)
	ctx.useTypingMap = ctx.useTypingChars && fromName == "Normal"
	ctx.lookupData = fromData
	ctx.textToKramaMap = fromData.TextToKramaMapArr
	if ctx.useTypingMap {
		ctx.lookupData = toData
		ctx.textToKramaMap = toData.TypingTextToKramaMapArr
	}
	ctx.tildeIsText = ctx.lookupData.TextToKramaMapCharIndex('~', ctx.useTypingMap) != -1 ||
		kramaIndexOfText(fromData, "~") != -1
	ctx.taExtSkipIndex = -1

	var charsBuf []cursorChar
	var outBuf []byte
	if scratch != nil {
		charsBuf, outBuf = scratch.chars, scratch.out
	}
	trackResultPieces := len(customRules) > 0 || ctx.sinhalaConjunctHalant
	// ^ as currently we are using rewriteAt only for sinhala target
	resultCapacity := len(text)
	if ctx.mode == modeOtherToBrahmic {
		resultCapacity = len(text) * 3 // brahmic script usually use 3x more bytes
	}
	ctx.result = newResultStringBuilder(outBuf, resultCapacity, trackResultPieces)
	ctx.cursor = newInputCursor(text, charsBuf)
}

// prevEndsWithVyanjana reports whether the last context item is a vyanjana, or a vyanjana + nuqta
func (ctx *transliterateCtx) prevEndsWithVyanjana() bool {
	prev := &ctx.prevCtx
	return prev.typeAt(-1) == scriptdata.ListKindVyanjana ||
		(ctx.hasNuqta &&
			prev.typeAt(-2) == scriptdata.ListKindVyanjana &&
			prev.textAt(-1) == ctx.brahmicNuqta)
}

// resultEndsWithTaExtSuperscript reports whether the result ends with a Tamil-Extended
// superscript (a mAtrA, halant or Vedic svara written next goes before it)
func (ctx *transliterateCtx) resultEndsWithTaExtSuperscript() bool {
	return ctx.isToTamilExt && isTaExtSuperscriptTail(ctx.result.lastChar())
}

// emitHalant emits the (skipped) halant in other -> brahmic conversion
func (ctx *transliterateCtx) emitHalant() {
	shouldReorder := ctx.resultEndsWithTaExtSuperscript()
	ctx.result.emitPiecesWithReorder([]string{ctx.brahmicHalant}, ctx.toData.Halant, shouldReorder)
	if ctx.sinhalaConjunctHalant {
		if lp, ok := ctx.result.lastPiece(); ok {
			ctx.result.rewriteAt(-1, lp+zwj)
		}
	}
}

// contextTextOfMatch is the text of a match as it is stored in the context: a match which is the
// halant (a halant variant matched as a whole, or the halant typed by its own key) is stored as
// the halant itself
func contextTextOfMatch(s *scriptdata.ScriptData, krama []int16, matchedText, halant string) string {
	if len(krama) == 1 && kramaTextOrEmpty(s, int(krama[0])) == halant {
		return halant
	}
	return matchedText
}

// clearContextAfterMatra: vyanjana (+ nuqta) + mAtrA in the context, the syllable is complete,
// an `anya` after it starts with an empty context
func (ctx *transliterateCtx) clearContextAfterMatra() {
	prev := &ctx.prevCtx
	if (ctx.hasNuqta &&
		prev.typeAt(-3) == scriptdata.ListKindVyanjana &&
		prev.textAt(-2) == ctx.brahmicNuqta &&
		prev.typeAt(-1) == scriptdata.ListKindMatra) ||
		(prev.typeAt(-2) == scriptdata.ListKindVyanjana &&
			prev.typeAt(-1) == scriptdata.ListKindMatra) {
		prev.clear()
	}
}

// emitPendingSchwa (brahmic -> other) writes the inherent vowel of the vyanjana before the item,
// when the item is not its mAtrA or halant
func (ctx *transliterateCtx) emitPendingSchwa(itemText string, itemKind scriptdata.ListKind) {
	// Short-circuit chain ordered cheapest/most selective first (all checks are pure).
	// Since `itemText != halant` is required, the former `toAnyaOrNull`
	// (`(!matra && text != halant) || anya || nil`) reduces to `!matra`.
	if itemKind != scriptdata.ListKindMatra &&
		// vyanjana or vyanjana + nuqta
		ctx.prevEndsWithVyanjana() &&
		itemText != ctx.brahmicHalant &&
		(!ctx.hasNuqta || itemText != ctx.brahmicNuqta) &&
		(!ctx.isFromTamilExt || firstRuneDiffers(itemText, ctx.brahmicHalant)) {
		ctx.result.emit(ctx.toData.SchwaCharacter)
	}
}

// joinToPrevVyanjana (other -> brahmic): a vowel after a vyanjana is written as its mAtrA, else
// the vyanjana takes the halant.
//
// It returns `true` when the item (the mAtrA) was written to the result here
func (ctx *transliterateCtx) joinToPrevVyanjana(itemText string, itemList *scriptdata.ListItem) bool {
	itemKind := itemList.Kind()
	prevIsVyanjana := ctx.prevCtx.typeAt(-1) == scriptdata.ListKindVyanjana
	if prevIsVyanjana &&
		(itemKind == scriptdata.ListKindMatra || itemKind == scriptdata.ListKindSvara) {
		linkedMatra := itemText
		if itemKind == scriptdata.ListKindSvara {
			kr := -1
			if len(itemList.MatraKramaRef) > 0 {
				kr = int(itemList.MatraKramaRef[0])
			}
			linkedMatra = kramaTextOrEmpty(ctx.toData, kr)
		}
		ctx.result.emitPiecesWithReorder([]string{linkedMatra}, ctx.toData.Halant,
			ctx.resultEndsWithTaExtSuperscript())
		return true
	}
	if
	// default transliteration behavior (without schwa deletion)
	(!ctx.includeInherentVowel &&
		prevIsVyanjana &&
		itemKind != scriptdata.ListKindMatra &&
		itemText != ctx.brahmicHalant) ||
		// if to include inherent vowel then check when to add that skipped halant
		(ctx.includeInherentVowel &&
			itemKind == scriptdata.ListKindVyanjana &&
			ctx.prevEndsWithVyanjana()) {
		ctx.emitHalant()
	}
	return false
}

// updatePrevContext: the typing mode context clear, then the item is added to the context
func (ctx *transliterateCtx) updatePrevContext(
	itemText string,
	itemKind scriptdata.ListKind,
	next []string,
	emitsTaExtSuperscriptTail bool,
) {
	if !ctx.typingMode {
		ctx.prevCtx.push(itemText, itemKind)
		return
	}
	// custom typing mode context clear logic
	// only clear context if there are no next characters
	if len(next) == 0 &&
		// the case below is to enable typing of _, ' (Vedic svara chihnas too)
		!(ctx.isToTamilExt && (emitsTaExtSuperscriptTail || isTaExtSuperscriptTail(ctx.result.lastChar()))) &&
		// do not clear the context only if case where the current added element is a vyanjana
		itemKind != scriptdata.ListKindVyanjana {
		ctx.prevCtx.clear()
		return
	}
	ctx.prevCtx.push(itemText, itemKind)
}

// prevContextCleanup is called before an item is written: it writes what the context still owes
// (the inherent vowel, the halant, or the item itself as a mAtrA), then adds the item to the
// context.
//
//   - `itemText`: text of the current item (stored in the context), `itemList` its list item (type)
//   - `next`: the keys that can follow the item (typing mode: the context is kept while more keys
//     can follow)
//
// It returns `true` when the current write already handled concatenation/reordering.
func (ctx *transliterateCtx) prevContextCleanup(
	itemText string,
	itemList *scriptdata.ListItem,
	next []string,
) bool {
	return ctx.prevContextCleanupExt(itemText, itemList, next, false)
}

// prevContextCleanupExt is prevContextCleanup with `emitsTaExtSuperscriptTail`: the text of the
// current item (emitted after this call) ends with a Tamil-Extended superscript, eg `RR` -> `ரூ²`.
// Like when the superscript is already the last character, the typing context is kept so that a
// Vedic svara typed next goes before it.
func (ctx *transliterateCtx) prevContextCleanupExt(
	itemText string,
	itemList *scriptdata.ListItem,
	next []string,
	emitsTaExtSuperscriptTail bool,
) bool {
	itemKind := itemList.Kind()
	if itemKind == scriptdata.ListKindAnya {
		ctx.clearContextAfterMatra()
	}
	resultConcat := false
	switch ctx.mode {
	case modeBrahmicToOther:
		ctx.emitPendingSchwa(itemText, itemKind)
	case modeOtherToBrahmic:
		resultConcat = ctx.joinToPrevVyanjana(itemText, itemList)
	}
	ctx.updatePrevContext(itemText, itemKind, next, emitsTaExtSuperscriptTail)
	return resultConcat
}

// flushPrevContext is called after the last character: the inherent vowel / halant still owed to
// a trailing vyanjana. Nothing is added to the context.
func (ctx *transliterateCtx) flushPrevContext() {
	if ctx.mode == modeNone {
		return
	}
	// (the JS version does not clear the context here)
	ctx.clearContextAfterMatra()
	switch ctx.mode {
	case modeBrahmicToOther:
		ctx.emitPendingSchwa("", scriptdata.ListKindNone)
	case modeOtherToBrahmic:
		ctx.joinToPrevVyanjana("", nil)
	}
}
