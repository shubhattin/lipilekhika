package transliterate

import (
	"slices"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/scriptdata"
)

const (
	defaultUseNativeNum         = true
	defaultIncludeInherentVowel = false
)

const (
	optUseTypingChars        = "normal_to_all:use_typing_chars"
	optPreserveSpecificChars = "all_to_normal:preserve_specific_chars"
	optSinhalaConjunctHalant = "all_to_sinhala:use_conjunct_enabling_halant"
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

// ResolvedRules holds the resolved transliteration rules.
type ResolvedRules struct {
	TransOptions map[string]bool
	CustomRules  []scriptdata.Rule
}

func getActiveCustomOptions(
	fromData, toData *scriptdata.ScriptData,
	customOptionsMap map[string]scriptdata.CustomOption,
	inputOptions map[string]bool,
) map[string]bool {
	if inputOptions == nil {
		return nil
	}
	active := make(map[string]bool)
	fromName := fromData.ScriptName
	toName := toData.ScriptName
	fromType := fromData.ScriptType
	toType := toData.ScriptType

	for key, enabled := range inputOptions {
		opt, ok := customOptionsMap[key]
		if !ok {
			continue
		}
		fromAll := opt.FromScriptType != nil && *opt.FromScriptType == scriptdata.ScriptTypeAll
		toAll := opt.ToScriptType != nil && *opt.ToScriptType == scriptdata.ScriptTypeAll
		if fromAll && toAll {
			active[key] = enabled
			continue
		}
		fromMatch := (opt.FromScriptType != nil &&
			(*opt.FromScriptType == scriptdata.ScriptTypeAll || *opt.FromScriptType == fromType)) ||
			contains(opt.FromScriptName, fromName)
		if !fromMatch {
			continue
		}
		toMatch := (opt.ToScriptType != nil &&
			(*opt.ToScriptType == scriptdata.ScriptTypeAll || *opt.ToScriptType == toType)) ||
			contains(opt.ToScriptName, toName)
		if toMatch {
			active[key] = enabled
		}
	}
	return active
}

func contains(s []string, v string) bool {
	for _, x := range s {
		if x == v {
			return true
		}
	}
	return false
}

func resolveTransliterationRules(
	fromData, toData *scriptdata.ScriptData,
	customOptionsMap map[string]scriptdata.CustomOption,
	inputOptions map[string]bool,
) ResolvedRules {
	// The overwhelmingly common API call has no custom options. Avoid scanning
	// custom-option data when every option is necessarily disabled.
	if inputOptions == nil {
		return ResolvedRules{TransOptions: map[string]bool{}}
	}
	tOpts := getActiveCustomOptions(fromData, toData, customOptionsMap, inputOptions)
	// Rules are applied in the canonical option order (rule order can change the output
	// when several options are enabled), map iteration order would be random.
	var customRules []scriptdata.Rule
	for _, k := range orderedCustomOptionKeys(tOpts) {
		if opt, ok := customOptionsMap[k]; ok {
			customRules = append(customRules, opt.Rules...)
		}
	}
	return ResolvedRules{TransOptions: tOpts, CustomRules: customRules}
}

// customOptionKeys are the custom option keys in `custom_options.json` order
// (same as rust `CustomOptions::KEYS`; kept in sync by `TestCustomOptionKeysOrder`).
var customOptionKeys = []string{
	"all_to_normal:replace_pancham_varga_varna_with_n",
	"brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra",
	"all_to_sinhala:use_conjunct_enabling_halant",
	"all_to_normal:remove_virAma_and_double_virAma",
	"all_to_normal:replace_avagraha_with_a",
	"normal_to_all:use_typing_chars",
	"all_to_normal:preserve_specific_chars",
}

// orderedCustomOptionKeys returns the enabled keys of `opts` in canonical order
// (unknown keys, if any, last in sorted order).
func orderedCustomOptionKeys(opts map[string]bool) []string {
	keys := make([]string, 0, len(opts))
	for _, k := range customOptionKeys {
		if opts[k] {
			keys = append(keys, k)
		}
	}
	var unknown []string
	for k, enabled := range opts {
		if enabled && !slices.Contains(customOptionKeys, k) {
			unknown = append(unknown, k)
		}
	}
	sort.Strings(unknown)
	return append(keys, unknown...)
}

// ResolveTransliterationRules is an exported wrapper around resolveTransliterationRules.
// It enables other packages (like typing) to reuse the same rule resolution logic.
func ResolveTransliterationRules(
	fromData, toData *scriptdata.ScriptData,
	customOptionsMap map[string]scriptdata.CustomOption,
	inputOptions map[string]bool,
) ResolvedRules {
	return resolveTransliterationRules(fromData, toData, customOptionsMap, inputOptions)
}

func transOpt(m map[string]bool, key string) bool {
	v, ok := m[key]
	return ok && v
}

func getRuleReplaceText(rule *scriptdata.Rule, s *scriptdata.ScriptData) string {
	var b strings.Builder
	for _, k := range rule.ReplaceWith {
		if k >= 0 {
			b.WriteString(kramaTextOrEmpty(s, int(k)))
		}
	}
	return b.String()
}

func ruleUsesReplace(rule *scriptdata.Rule, allowed scriptdata.CheckIn) bool {
	if rule.UseReplace == nil || !*rule.UseReplace {
		return false
	}
	return rule.CheckIn != nil && *rule.CheckIn == allowed
}

func ruleChecksOutput(rule *scriptdata.Rule) bool {
	return rule.CheckIn != nil && *rule.CheckIn == scriptdata.CheckInOutput
}

// applyCustomReplaceRules only applies rules marked with `use_replace=true` (fast replaceAll pass).
func applyCustomReplaceRules(
	text string,
	s *scriptdata.ScriptData,
	rules []scriptdata.Rule,
	allowed scriptdata.CheckIn,
) string {
	for i := range rules {
		r := &rules[i]
		if !ruleUsesReplace(r, allowed) {
			continue
		}
		switch r.Type {
		case "replace_prev_krama_keys":
			prevStr := ""
			for _, p := range r.Prev {
				if p >= 0 {
					prevStr += kramaTextOrEmpty(s, int(p))
				}
			}
			replText := getRuleReplaceText(r, s)
			for _, fi := range r.Following {
				if fi < 0 {
					continue
				}
				followStr := kramaTextOrEmpty(s, int(fi))
				if followStr == "" {
					continue
				}
				text = strings.ReplaceAll(text, prevStr+followStr, replText+followStr)
			}
		case "direct_replace":
			replText := replTextForDirectReplace(r, s)
			for _, grp := range r.ToReplace {
				toRepl := ""
				for _, k := range grp {
					if k >= 0 {
						toRepl += kramaTextOrEmpty(s, int(k))
					}
				}
				if toRepl != "" {
					text = strings.ReplaceAll(text, toRepl, replText)
				}
			}
		}
	}
	return text
}

func replTextForDirectReplace(r *scriptdata.Rule, s *scriptdata.ScriptData) string {
	if r.ReplaceText != nil {
		return *r.ReplaceText
	}
	return getRuleReplaceText(r, s)
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

type transliterateCtx struct {
	fromName, toName     string
	fromData, toData     *scriptdata.ScriptData
	customRules          []scriptdata.Rule
	cursor               *inputCursor
	result               *resultStringBuilder
	prevCtx              *prevContextBuilder
	brahmicHalant        string
	brahmicNuqta         string
	hasNuqta             bool
	typingMode           bool
	includeInherentVowel bool
	isFromTamilExt       bool
	isToTamilExt         bool
	sinhalaConjunct      bool
}

func (ctx *transliterateCtx) resultLastCharIsTaExtSuperscript() bool {
	return isTaExtSuperscriptTail(ctx.result.lastChar())
}

// prevContextCleanup returns `true` when the current write already handled concatenation/reordering.
//
// `lastExtraCall` is the final call after the input is consumed (it carries no item).
func (ctx *transliterateCtx) prevContextCleanup(
	itemText string,
	itemList *scriptdata.ListItem,
	next []string,
	lastExtraCall bool,
) bool {
	return ctx.prevContextCleanupExt(itemText, itemList, next, lastExtraCall, false)
}

// prevContextCleanupExt is prevContextCleanup with `emitsTaExtSuperscriptTail`: the text of the
// current item (emitted after this call) ends with a Tamil-Extended superscript, eg `RR` -> `ரூ²`.
// Like when the superscript is already the last character, the typing context is kept so that a
// Vedic svara typed next goes before it.
func (ctx *transliterateCtx) prevContextCleanupExt(
	itemText string,
	itemList *scriptdata.ListItem,
	next []string,
	lastExtraCall bool,
	emitsTaExtSuperscriptTail bool,
) bool {
	resultConcat := false
	itemKind := itemList.Kind()
	prev := ctx.prevCtx

	// custom cleanup logic/cases
	// (cheapest, most selective test first; all operands are side-effect free)
	if (lastExtraCall || itemKind == scriptdata.ListKindAnya) &&
		((ctx.hasNuqta &&
			prev.typeAt(-3) == scriptdata.ListKindVyanjana &&
			prev.textAt(-2) == ctx.brahmicNuqta &&
			prev.typeAt(-1) == scriptdata.ListKindMatra) ||
			(prev.typeAt(-2) == scriptdata.ListKindVyanjana &&
				prev.typeAt(-1) == scriptdata.ListKindMatra)) {
		prev.clear()
	}

	if ctx.fromData.ScriptType == scriptdata.ScriptTypeBrahmic &&
		ctx.toData.ScriptType == scriptdata.ScriptTypeOther {
		// custom logic when converting from brahmic to other.
		// Short-circuit chain ordered cheapest/most selective first (all checks are pure).
		// Since `itemText != halant` is required, the former `toAnyaOrNull`
		// (`(!matra && text != halant) || anya || nil`) reduces to `!matra`.
		if itemKind != scriptdata.ListKindMatra &&
			// vyanjana + nuqta
			(prev.typeAt(-1) == scriptdata.ListKindVyanjana ||
				(ctx.hasNuqta &&
					prev.typeAt(-2) == scriptdata.ListKindVyanjana &&
					prev.textAt(-1) == ctx.brahmicNuqta)) &&
			itemText != ctx.brahmicHalant &&
			(!ctx.hasNuqta || itemText != ctx.brahmicNuqta) &&
			(!ctx.isFromTamilExt || firstRuneDiffers(itemText, ctx.brahmicHalant)) {
			ctx.result.emit(ctx.toData.SchwaCharacter)
		}
	} else if ctx.fromData.ScriptType == scriptdata.ScriptTypeOther &&
		ctx.toData.ScriptType == scriptdata.ScriptTypeBrahmic {
		// custom logic when converting from other to brahmic
		if prev.typeAt(-1) == scriptdata.ListKindVyanjana &&
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
				ctx.isToTamilExt && ctx.resultLastCharIsTaExtSuperscript())
			resultConcat = true
		} else if !ctx.includeInherentVowel &&
			prev.typeAt(-1) == scriptdata.ListKindVyanjana &&
			itemKind != scriptdata.ListKindMatra &&
			itemText != ctx.brahmicHalant {
			ctx.emitHalant()
		} else if ctx.includeInherentVowel &&
			!lastExtraCall &&
			itemKind == scriptdata.ListKindVyanjana &&
			(prev.typeAt(-1) == scriptdata.ListKindVyanjana ||
				(ctx.hasNuqta &&
					prev.typeAt(-2) == scriptdata.ListKindVyanjana &&
					prev.textAt(-1) == ctx.brahmicNuqta)) {
			ctx.emitHalant()
		}
	}

	// custom typing mode context clear logic
	// only clear context if there are no next characters or if its last extra call
	toClear := false
	if ctx.typingMode && len(next) == 0 && !lastExtraCall &&
		// the case below is to enable typing of _, ' (Vedic svara chihnas too)
		!(ctx.isToTamilExt && (emitsTaExtSuperscriptTail || ctx.resultLastCharIsTaExtSuperscript())) {
		toClear = true
		// do not clear the context only if case where the current added element is a vyanjana
		if itemKind == scriptdata.ListKindVyanjana {
			toClear = false
		}
		if toClear {
			prev.clear()
		}
	}

	// addition and shifting
	// in typing it should not be the last extra call
	if (!ctx.typingMode || (!lastExtraCall && !toClear)) && !lastExtraCall {
		prev.push(itemText, itemKind)
	}
	return resultConcat
}

// emitHalant emits the (skipped) halant in other -> brahmic conversion
func (ctx *transliterateCtx) emitHalant() {
	shouldReorder := ctx.isToTamilExt && ctx.resultLastCharIsTaExtSuperscript()
	ctx.result.emitPiecesWithReorder([]string{ctx.brahmicHalant}, ctx.toData.Halant, shouldReorder)
	if ctx.toName == "Sinhala" && ctx.sinhalaConjunct {
		if lp, ok := ctx.result.lastPiece(); ok {
			ctx.result.rewriteAt(-1, lp+"‍")
		}
	}
}

func (ctx *transliterateCtx) applyCustomTransRules(textIndex, delta int) {
	currentIdx := textIndex + delta
	for i := range ctx.customRules {
		rule := &ctx.customRules[i]
		if rule.UseReplace != nil && *rule.UseReplace {
			continue
		}
		switch rule.Type {
		case "replace_prev_krama_keys":
			// Bail out if any prev index is negative
			if hasNegative(rule.Prev) {
				continue
			}
			if !ruleChecksOutput(rule) {
				if currentIdx < 0 || textIndex < 0 {
					continue
				}
				matched, mLen := matchPrevKramaSequence(ctx.cursor.peekAtStr, currentIdx, rule.Prev, ctx.fromData)
				if !matched {
					continue
				}
				nextR, ok := ctx.cursor.peekAt(textIndex)
				if !ok {
					continue
				}
				nextIdx := kramaIndexOfChar(ctx.fromData, nextR)
				if nextIdx < 0 || !containsI16(rule.Following, int16(nextIdx)) {
					continue
				}
				ctx.result.rewriteTailPieces(mLen, replaceWithPieces(rule.ReplaceWith, ctx.toData))
			} else {
				// output
				lp, ok := ctx.result.lastPiece()
				if !ok {
					continue
				}
				followIdx := kramaIndexOfText(ctx.toData, lp)
				if followIdx < 0 || !containsI16(rule.Following, int16(followIdx)) {
					continue
				}
				matched, mLen := matchPrevKramaSequence(ctx.result.peekAt, -2, rule.Prev, ctx.toData)
				if matched {
					pieces := replaceWithPieces(rule.ReplaceWith, ctx.toData)
					pieces = append(pieces, lp) // instead [...pieces, last_piece]
					ctx.result.rewriteTailPieces(mLen+1, pieces)
				}
			}
		case "direct_replace":
			lookup := ctx.fromData
			if ruleChecksOutput(rule) {
				lookup = ctx.toData
			}
			for _, grp := range rule.ToReplace {
				if hasNegative(grp) {
					continue
				}
				matched, mLen := matchPrevKramaSequence(ctx.result.peekAt, -1, grp, lookup)
				if !matched {
					continue
				}
				if rule.ReplaceText != nil {
					ctx.result.rewriteTailPieces(mLen, []string{*rule.ReplaceText})
				} else {
					ctx.result.rewriteTailPieces(mLen, replaceWithPieces(rule.ReplaceWith, lookup))
				}
				break
			}
		}
	}
}

func hasNegative(v []int16) bool {
	for _, n := range v {
		if n < 0 {
			return true
		}
	}
	return false
}

func containsI16(v []int16, x int16) bool {
	for _, n := range v {
		if n == x {
			return true
		}
	}
	return false
}

func containsRune(v []rune, x rune) bool {
	for _, n := range v {
		if n == x {
			return true
		}
	}
	return false
}

// runeIsStr reports whether `s` is exactly the single rune `r`.
func runeIsStr(r rune, s string) bool {
	sr, size := utf8.DecodeRuneInString(s)
	return size > 0 && size == len(s) && sr == r
}

// firstRuneDiffers reports whether the first runes of `a` and `b` differ (an empty string has none).
func firstRuneDiffers(a, b string) bool {
	if a == "" || b == "" {
		return a != b
	}
	ra, _ := utf8.DecodeRuneInString(a)
	rb, _ := utf8.DecodeRuneInString(b)
	return ra != rb
}

// emitKramaPieces emits the target-script text of each krama index directly
// (negative/missing entries produce nothing), without first collecting the pieces.
func emitKramaPieces(result *resultStringBuilder, toData *scriptdata.ScriptData, krama []int16) {
	for _, k := range krama {
		if k >= 0 {
			result.emit(kramaTextOrEmpty(toData, int(k)))
		}
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
	// option flags resolved once (nil-map reads return false)
	transOptUseTypingChars := transOpt(transOptions, optUseTypingChars)
	optPreserveSpecificChars := transOpt(transOptions, optPreserveSpecificChars) && toName == "Normal"

	if opts.TypingMode && fromName == "Normal" {
		text = applyTypingInputAliases(text, toName)
	}
	if len(customRules) > 0 {
		text = applyCustomReplaceRules(text, fromData, customRules, scriptdata.CheckInInput)
	}

	var charsBuf []cursorChar
	var outBuf []byte
	if scratch != nil {
		charsBuf, outBuf = scratch.chars, scratch.out
	}

	trackResultPieces := len(customRules) > 0 ||
		(toName == "Sinhala" && transOpt(transOptions, optSinhalaConjunctHalant))
	// ^ as currently we are using rewriteAt only for sinhala target
	resultCapacity := len(text)
	if fromData.ScriptType == scriptdata.ScriptTypeOther && toData.ScriptType == scriptdata.ScriptTypeBrahmic {
		resultCapacity = len(text) * 3 // brahmic script usually use 3x more bytes
	}
	result := newResultStringBuilder(outBuf, resultCapacity, trackResultPieces)
	cursor := newInputCursor(text, charsBuf)
	var prevCtx prevContextBuilder

	fromBrahmic := fromData.ScriptType == scriptdata.ScriptTypeBrahmic
	toBrahmic := toData.ScriptType == scriptdata.ScriptTypeBrahmic
	fromOther := fromData.ScriptType == scriptdata.ScriptTypeOther
	toOther := toData.ScriptType == scriptdata.ScriptTypeOther

	prevContextInUse := (fromBrahmic && toOther) || (fromOther && toBrahmic) ||
		(opts.TypingMode && fromName == "Normal" && toOther)

	ctx := transliterateCtx{
		fromName: fromName, toName: toName,
		fromData: fromData, toData: toData,
		customRules:          customRules,
		cursor:               &cursor,
		result:               &result,
		prevCtx:              &prevCtx,
		typingMode:           opts.TypingMode,
		includeInherentVowel: opts.IncludeInherentVowel,
		isFromTamilExt:       isScriptTamilExt(fromName),
		isToTamilExt:         isScriptTamilExt(toName),
		sinhalaConjunct:      transOpt(transOptions, optSinhalaConjunctHalant),
	}
	if fromBrahmic && toOther {
		ctx.brahmicHalant = fromData.Halant
		if fromData.Nuqta != nil {
			ctx.brahmicNuqta, ctx.hasNuqta = *fromData.Nuqta, true
		}
	} else if fromOther && toBrahmic {
		ctx.brahmicHalant = toData.Halant
		if toData.Nuqta != nil {
			ctx.brahmicNuqta, ctx.hasNuqta = *toData.Nuqta, true
		}
	}

	// choose matching map
	useTypingMap := (transOptUseTypingChars || opts.TypingMode) && fromName == "Normal"
	lookupData := fromData
	if useTypingMap {
		lookupData = toData
	}
	textToKramaMap := fromData.TextToKramaMapArr
	if useTypingMap {
		textToKramaMap = toData.TypingTextToKramaMapArr
	}

	// Used when converting from Tamil-Extended (superscript numbers)
	ignoreTaExtSupIndex := -1

	charsLen := cursor.charCount()
	for cursor.pos < charsLen {
		textIndex := cursor.pos
		ch, ok := cursor.peek()
		if !ok {
			break
		}

		if ignoreTaExtSupIndex != -1 && textIndex >= ignoreTaExtSupIndex {
			ignoreTaExtSupIndex = -1
			cursor.advance(1)
			continue
		}

		// skip certain chars (preserve as-is)
		if isSkipChar(ch) {
			cursor.advance(1)
			if prevContextInUse {
				ctx.prevContextCleanup(" ", nil, nil, false)
				prevCtx.clear()
			}
			result.emitRune(ch)
			continue
		}

		// latin digits passthrough if native numerals disabled
		if ch >= '0' && ch <= '9' && !opts.UseNativeNumerals {
			cursor.advance(1)
			digit, _ := cursor.peekAtStr(textIndex)
			// cleanup first, so a pending halant/schwa goes before the digit (k0 -> क्0)
			ctx.prevContextCleanup(digit, nil, nil, false)
			result.emitRune(ch)
			continue
		}

		// Preserve mode: custom script chars when converting to Normal
		if optPreserveSpecificChars {
			chStr, _ := cursor.peekAtStr(textIndex)
			if idx, ok := fromData.CustomScriptCharsLookup[chStr]; ok {
				item := &fromData.CustomScriptCharsArr[idx]
				var listItem *scriptdata.ListItem
				if item.FirstRef != nil {
					listItem = listItemAt(fromData, int(*item.FirstRef))
				}
				ctx.prevContextCleanup(item.Text, listItem, nil, false)
				normalText := ""
				if item.SecondRef != nil {
					si := int(*item.SecondRef)
					if si >= 0 && si < len(fromData.TypingTextToKramaMapArr) {
						normalText = fromData.TypingTextToKramaMapArr[si].Text
					}
				}
				result.emit(normalText)
				cursor.advance(utf8.RuneCountInString(item.Text))
				continue
			}
		}

		// Step 1: match text_to_krama_map / typing_text_to_krama_map
		itemIndex := -1
		// the matched text ends with a Tamil-Extended superscript that is not next to the rest of
		// it in the input (a Vedic svara is in between), so it is not to be advanced over
		taExtSuperscriptDetached := false
		{
			scanUnits := 0
			lastValidVowelMatchIndex := -1
			checkVowelRetraction := prevContextInUse && fromOther && toBrahmic &&
				(prevCtx.typeAt(-1) == scriptdata.ListKindVyanjana ||
					(ctx.hasNuqta &&
						prevCtx.typeAt(-2) == scriptdata.ListKindVyanjana &&
						prevCtx.textAt(-1) == ctx.brahmicNuqta))

			for {
				if ignoreTaExtSupIndex != -1 && isTaExtSuperscriptTail(cursor.peekAt(textIndex+scanUnits+1)) {
					scanUnits++ // each char is 1 unit
				}

				endIndex := textIndex + scanUnits + 1
				singleCharLookup := scanUnits == 0 && ignoreTaExtSupIndex == -1
				// The single-char fast path never reads `charToSearch` unless the match
				// has a `next` list, so build the slice lazily.
				charToSearch := ""
				var potentialMatchIndex int
				if singleCharLookup {
					// more scan units only needed in case ta-ext so safe to do
					potentialMatchIndex = lookupData.TextToKramaMapCharIndex(ch, useTypingMap)
				} else {
					if ignoreTaExtSupIndex != -1 {
						charToSearch = cursor.slice(textIndex, ignoreTaExtSupIndex)
						if endIndex > ignoreTaExtSupIndex {
							charToSearch += cursor.slice(ignoreTaExtSupIndex+1, endIndex)
						}
					} else {
						charToSearch = cursor.slice(textIndex, endIndex)
					}
					potentialMatchIndex = lookupData.TextToKramaMapIndex(charToSearch, useTypingMap)
				}
				if potentialMatchIndex < 0 {
					itemIndex = -1
					break
				}
				potentialMatch := &textToKramaMap[potentialMatchIndex].Value

				// vowel retraction support (kAUM etc.)
				if checkVowelRetraction && len(potentialMatch.Krama) > 0 {
					kramaID := potentialMatch.Krama[0]
					if kramaID >= 0 {
						kind := kramaListItem(toData, int(kramaID)).Kind()
						isSingleVowel := len(potentialMatch.Krama) == 1 &&
							(kind == scriptdata.ListKindSvara || kind == scriptdata.ListKindMatra)
						if isSingleVowel {
							lastValidVowelMatchIndex = potentialMatchIndex
						} else if lastValidVowelMatchIndex >= 0 {
							itemIndex = lastValidVowelMatchIndex
							break
						}
					}
				}

				// extend match if `next` allows it
				nextChars := potentialMatch.NextChars
				if len(nextChars) > 0 {
					nthCh, nthOk := cursor.peekAt(endIndex)

					// Tamil-Extended special handling (superscript numbers after matra/halant/svara)
					if ctx.isFromTamilExt && fromBrahmic {
						if singleCharLookup {
							charToSearch = cursor.slice(textIndex, endIndex)
						}
						isHalant := func(c rune) bool { return runeIsStr(c, fromData.Halant) }
						isMatra := func(c rune) bool {
							i := kramaIndexOfChar(fromData, c)
							return i >= 0 && kramaListItem(fromData, i).Kind() == scriptdata.ListKindMatra
						}
						// The superscript of the match can be after a halant or a mAtrA and Vedic svaras,
						// as the writer puts them before it:  [halant | mAtrA | mAtrA mAtrA]? svara* superscript
						// eg. க்² (ख्), கி⁴ (घि), கொ⁴ (घो as ெ + ா), க॒॑⁴ (घ॒॑), க்॒² (ख्॒), கி॒⁴ (घि॒), ரு॒॑² (ऋ॒॑)
						// In the match the superscript takes the place of these, which are read next.
						supIndex := endIndex
						hasSign := nthOk && (isHalant(nthCh) || isMatra(nthCh))
						if hasSign {
							supIndex++
							// mAtrA duplicates like O = E + A in gEA (or gO as visible when)
							if c, ok := cursor.peekAt(supIndex); ok && isMatra(nthCh) && isMatra(c) {
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
						if (hasSign || supIndex > svarasStart) &&
							isTaExtSuperscriptTail(supCh, supOk) && containsRune(nextChars, supCh) &&
							// no superscript is being skipped, or (with only svaras in between) the
							// skipped one is inside this match: the ² of க்² in க்²ரு॑² (खृ॑)
							(ignoreTaExtSupIndex == -1 || (!hasSign && ignoreTaExtSupIndex < endIndex)) {
							if charIndex := fromData.TextToKramaMapIndex(charToSearch+string(supCh), false); charIndex >= 0 {
								itemIndex = charIndex
								// With only svaras in between, a superscript already skipped inside this
								// match (the ² of க்² in க்²ரு॑²) makes up for the one after the svaras in
								// the match length, so the whole match is advanced over.
								if !hasSign {
									taExtSuperscriptDetached = ignoreTaExtSupIndex == -1
								}
								ignoreTaExtSupIndex = supIndex
								break
							}
						}
						// The match ends with halant + a letter that cannot be continued (ல்ர is the
						// start of ல்ரி² ல்ரீ² (ऌ ॡ)), but the halant starts a mAtrA ending in a
						// superscript (்ரு² ்ரூ²): stop the match before the halant, so ல்ரு² is read
						// as ல + ்ரு² (लृ), not ल्रु²
						if nthOk && !containsRune(nextChars, nthCh) && endIndex >= 2 {
							last, lastSize := utf8.DecodeLastRuneInString(charToSearch)
							beforeLast, beforeLastSize := utf8.DecodeLastRuneInString(charToSearch[:len(charToSearch)-lastSize])
							headLen := len(charToSearch) - lastSize - beforeLastSize
							c0, ok0 := cursor.peekAt(endIndex - 2)
							c1, ok1 := cursor.peekAt(endIndex - 1)
							if headLen > 0 && isHalant(beforeLast) && ok0 && ok1 && c0 == beforeLast && c1 == last {
								tailSupIndex := endIndex + 1
								for {
									c, ok := cursor.peekAt(tailSupIndex)
									if !isVedicSvaraTail(c, ok) {
										break
									}
									tailSupIndex++
								}
								if tailSup, ok := cursor.peekAt(tailSupIndex); ok && isTaExtSuperscriptTail(tailSup, ok) {
									tail := string([]rune{beforeLast, last, nthCh, tailSup})
									if fromData.TextToKramaMapIndex(tail, false) >= 0 {
										if headIndex := fromData.TextToKramaMapIndex(charToSearch[:headLen], false); headIndex >= 0 {
											itemIndex = headIndex
											break
										}
									}
								}
							}
						}
					}

					// Generic: if the next character is in the next list, extend scan and continue
					if nthOk && containsRune(nextChars, nthCh) {
						scanUnits++ // each char is 1 unit
						continue
					}
				}

				itemIndex = potentialMatchIndex
				break
			}
		}

		// (the Tamil-Extended matches index into `fromData.TextToKramaMapArr`, which is
		// `textToKramaMap` as the typing map is only used with `Normal` as the input)
		matchedText := ""
		if itemIndex >= 0 {
			entry := &textToKramaMap[itemIndex]
			matchedText = entry.Text
			m := &entry.Value
			// a match always starts at `ch`, so equal byte length means it is exactly `ch`
			matchedCharCount := 1
			if len(matchedText) != utf8.RuneLen(ch) {
				matchedCharCount = utf8.RuneCountInString(matchedText)
			}
			// only relevant while skipping a Tamil-Extended superscript; evaluated lazily
			indexDeleteLength := 0
			if taExtSuperscriptDetached {
				indexDeleteLength = 1
			} else if ignoreTaExtSupIndex != -1 && matchedCharCount > 1 && len(m.Krama) > 0 &&
				kramaListItem(fromData, int(m.Krama[0])).Kind() == scriptdata.ListKindVyanjana {
				last, _ := utf8.DecodeLastRuneInString(matchedText)
				if isTaExtSuperscriptTail(last, true) {
					indexDeleteLength = 1
				}
			}
			matchedLenUnits := matchedCharCount - indexDeleteLength
			cursor.advance(matchedLenUnits)

			if (opts.TypingMode || transOptUseTypingChars) && m.CustomBackRef != nil &&
				*m.CustomBackRef >= 0 && int(*m.CustomBackRef) < len(toData.CustomScriptCharsArr) {
				customItem := &toData.CustomScriptCharsArr[*m.CustomBackRef]
				var listItem *scriptdata.ListItem
				if customItem.FirstRef != nil {
					listItem = listItemAt(toData, int(*customItem.FirstRef))
				}
				// cleanup first, so a pending halant goes before the custom character
				// (kqq -> क्q, k.qSha -> क्‍ष)
				// custom characters are never svara/mAtrA, so cleanup never emits them itself
				ctx.prevContextCleanup(matchedText, listItem, m.Next, false)
				result.emit(customItem.Text)
				continue
			}

			krama := m.Krama
			// If krama exists and has at least one non -1, emit directly
			if hasKramaOtherThanNeg1(krama) {
				// prev-context bookkeeping
				resultConcat := false
				if prevContextInUse {
					if fromBrahmic && toOther {
						// pick a brahmic list item (from-script) if available
						var item *scriptdata.ListItem
						if m.FallbackListRef != nil && !(transOptUseTypingChars || opts.TypingMode) {
							item = listItemAt(fromData, int(*m.FallbackListRef))
						}
						if item == nil && len(krama) > 0 {
							if ctx.isFromTamilExt && anyKramaKind(fromData, krama, scriptdata.ListKindMatra) &&
								anyKramaKind(fromData, krama, scriptdata.ListKindVyanjana) {
								item = &scriptdata.AnyaListItem
							} else if ctx.isFromTamilExt && len(krama) > 1 &&
								anyKramaKind(fromData, krama, scriptdata.ListKindNone) {
								item = kramaListItem(fromData, int(krama[len(krama)-1]))
							} else {
								item = kramaListItem(fromData, int(krama[0]))
							}
						}
						// A halant variant matched as a whole (Sinhala al-lakuna + ZWJ `්‍`) is
						// passed as the halant itself, so that the cleanup does not add an inherent
						// vowel before it (ක්‍ෂ -> kSha, not kaSha)
						itemText := matchedText
						if len(krama) == 1 && kramaTextOrEmpty(fromData, int(krama[0])) == ctx.brahmicHalant {
							itemText = ctx.brahmicHalant
						}
						resultConcat = ctx.prevContextCleanup(itemText, item, nil, false)
					} else if toBrahmic && fromOther {
						var item *scriptdata.ListItem
						if m.FallbackListRef != nil {
							item = listItemAt(toData, int(*m.FallbackListRef))
						} else if len(krama) > 0 {
							item = kramaListItem(toData, int(krama[0]))
						}
						typingFromNormal := opts.TypingMode && fromName == "Normal"
						var next []string
						if typingFromNormal {
							next = m.Next
						}
						// The halant typed by its own key (`.h`) is passed as the halant itself, so
						// that the cleanup does not add a second one after a vyanjana
						// (k.h -> क्, not क््)
						itemText := matchedText
						if len(krama) == 1 && kramaTextOrEmpty(toData, int(krama[0])) == ctx.brahmicHalant {
							itemText = ctx.brahmicHalant
						}
						emitsTaExtSuperscriptTail := false
						if typingFromNormal && ctx.isToTamilExt {
							last, size := utf8.DecodeLastRuneInString(kramaTextOrEmpty(toData, int(krama[len(krama)-1])))
							emitsTaExtSuperscriptTail = isTaExtSuperscriptTail(last, size > 0)
						}
						resultConcat = ctx.prevContextCleanupExt(itemText, item, next, false, emitsTaExtSuperscriptTail)
					} else if opts.TypingMode && fromName == "Normal" && toOther {
						resultConcat = ctx.prevContextCleanup(matchedText, nil, m.Next, false)
					}
				}

				if !resultConcat {
					// Tamil-Extended output reorder (matra/halant after superscript)
					if toBrahmic && ctx.isToTamilExt && ctx.resultLastCharIsTaExtSuperscript() {
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
					} else {
						emitKramaPieces(&result, toData, krama)
					}
				}

				if len(customRules) > 0 {
					ctx.applyCustomTransRules(cursor.pos, -matchedLenUnits)
				}
				continue
			} else if containsI16(krama, -1) {
				// krama contains -1 entries: emit raw match
				// (prefix-only entries like `c` of `ch` or `S` of `Sh`)
				// cleanup first, so a pending halant goes before the text (kc -> क्c)
				if opts.TypingMode {
					ctx.prevContextCleanup(matchedText, nil, m.Next, false)
				} else if prevContextInUse {
					// like an unknown character (see Step 2), `kca` -> क्cअ
					ctx.prevContextCleanup(matchedText, nil, nil, false)
					prevCtx.clear()
				}
				result.emit(matchedText)
				continue
			}
		} else {
			cursor.advance(1)
		}

		// Step 2: Search in krama_text_arr
		var charToSearch string
		var index int
		if itemIndex < 0 {
			// pos - 1 as the fallback consumed (advanced 1) the previous character
			charToSearch, _ = cursor.peekAtStr(cursor.pos - 1)
			index = kramaIndexOfChar(fromData, ch) // no string lookup needed
		} else {
			charToSearch = matchedText
			index = kramaIndexOfText(fromData, charToSearch)
		}
		if index < 0 {
			if prevContextInUse {
				ctx.prevContextCleanup(charToSearch, nil, nil, false)
				prevCtx.clear()
			}
			result.emit(charToSearch)
			continue
		}

		resultConcat := false
		if prevContextInUse {
			if fromBrahmic {
				resultConcat = ctx.prevContextCleanup(charToSearch, kramaListItem(fromData, index), nil, false)
			} else if toBrahmic {
				resultConcat = ctx.prevContextCleanup(charToSearch, kramaListItem(toData, index), nil, false)
			} else if opts.TypingMode && fromName == "Normal" {
				// Typing into an `other` script: a key with no krama in the typing map (Romanized
				// `sh` / `ch`, prefixes of `shh` / `sh^` / `chh`) is resolved here. Pass its `next`
				// as in Step 1, so the context is kept while more keys can follow (else `shh` at
				// the start of a word comes out as `śh`), and cleared like in Step 1 when none can.
				var next []string
				if itemIndex >= 0 {
					next = textToKramaMap[itemIndex].Value.Next
				}
				ctx.prevContextCleanup(charToSearch, nil, next, false)
			}
		}

		if !resultConcat {
			piece := kramaTextOrEmpty(toData, index)
			if toBrahmic && ctx.isToTamilExt && ctx.resultLastCharIsTaExtSuperscript() {
				if piece == toData.Halant || kramaListItem(toData, index).Kind() == scriptdata.ListKindMatra {
					result.emitPiecesWithReorder([]string{piece}, toData.Halant, true)
				} else if lastRuneIsVedicSvara(piece) {
					last, _ := result.popLastChar()
					result.emit(piece)
					result.emitRune(last)
				} else {
					result.emit(piece)
				}
			} else {
				result.emit(piece)
			}
		}

		if len(customRules) > 0 {
			ctx.applyCustomTransRules(cursor.pos, -1)
		}
	}

	if prevContextInUse {
		ctx.prevContextCleanup("", nil, nil, true)
	}

	contextLength := prevCtx.length()
	output := string(result.buf)
	if scratch != nil {
		// hand the buffers back for reuse (`output` is a copy, so reusing `out` is safe)
		scratch.chars, scratch.out = cursor.chars, result.buf
	}
	if len(customRules) > 0 {
		output = applyCustomReplaceRules(output, toData, customRules, scriptdata.CheckInOutput)
	}
	return TransliterateOutput{Output: output, ContextLength: contextLength}, nil
}

func hasKramaOtherThanNeg1(krama []int16) bool {
	for _, k := range krama {
		if k != -1 {
			return true
		}
	}
	return false
}

// anyKramaKind reports whether any krama entry's list item has the given kind
// (`ListKindNone` matches entries without a list item).
func anyKramaKind(s *scriptdata.ScriptData, krama []int16, kind scriptdata.ListKind) bool {
	for _, k := range krama {
		if kramaListItem(s, int(k)).Kind() == kind {
			return true
		}
	}
	return false
}

func lastRuneIsVedicSvara(s string) bool {
	if s == "" {
		return false
	}
	r, _ := utf8.DecodeLastRuneInString(s)
	return isVedicSvaraTail(r, true)
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
	customOpts, err := scriptdata.GetCustomOptionsMap()
	if err != nil {
		return "", err
	}
	resolved := resolveTransliterationRules(fromData, toData, customOpts, transOptions)
	out, err := TransliterateTextCore(
		text, fromNorm, toNorm,
		fromData, toData,
		resolved.TransOptions, resolved.CustomRules,
		nil,
	)
	if err != nil {
		return "", err
	}
	return out.Output, nil
}
