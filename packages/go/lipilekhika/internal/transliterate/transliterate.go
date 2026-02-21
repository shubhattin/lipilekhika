package transliterate

import (
	"strings"
	"unicode/utf8"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/scriptdata"
)

const (
	maxContextLength            = 3
	charsToSkip                 = " \n\r\t,~!@?%"
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
	tOpts := getActiveCustomOptions(fromData, toData, customOptionsMap, inputOptions)
	if tOpts == nil {
		tOpts = make(map[string]bool)
	}
	var customRules []scriptdata.Rule
	for k, enabled := range tOpts {
		if !enabled {
			continue
		}
		if opt, ok := customOptionsMap[k]; ok {
			customRules = append(customRules, opt.Rules...)
		}
	}
	return ResolvedRules{TransOptions: tOpts, CustomRules: customRules}
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
				search := prevStr + followStr
				replace := replText + followStr
				text = strings.ReplaceAll(text, search, replace)
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

func i16ToIntSlice(v []int16) ([]int, bool) {
	out := make([]int, 0, len(v))
	for _, n := range v {
		if n < 0 {
			return nil, false
		}
		out = append(out, int(n))
	}
	return out, true
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
	if opts == nil {
		opts = &Options{
			UseNativeNumerals:    defaultUseNativeNum,
			IncludeInherentVowel: defaultIncludeInherentVowel,
		}
	}
	if opts.TypingMode && fromName != "Normal" {
		return TransliterateOutput{}, &TransliterateError{Msg: "typing mode requires Normal as from script"}
	}
	// Only copy transOptions when we need to mutate it (typing mode adds a key).
	// For the common non-typing path, alias the map directly — Go nil-map reads
	// return the zero value (false) so this is safe even when transOptions is nil.
	var tOpts map[string]bool
	if opts.TypingMode {
		tOpts = make(map[string]bool, len(transOptions)+1)
		for k, v := range transOptions {
			tOpts[k] = v
		}
		tOpts["normal_to_all:use_typing_chars"] = true
	} else {
		tOpts = transOptions
	}
	if opts.TypingMode && fromName == "Normal" {
		text = applyTypingInputAliases(text, toName)
	}
	text = applyCustomReplaceRules(text, fromData, customRules, scriptdata.CheckInInput)

	result := newResultStringBuilder()
	cursor := newInputCursor(text)
	prevCtx := newPrevContextBuilder(maxContextLength)

	prevContextInUse := (fromData.ScriptType == scriptdata.ScriptTypeBrahmic && toData.ScriptType == scriptdata.ScriptTypeOther) ||
		(fromData.ScriptType == scriptdata.ScriptTypeOther && toData.ScriptType == scriptdata.ScriptTypeBrahmic) ||
		(opts.TypingMode && fromName == "Normal" && toData.ScriptType == scriptdata.ScriptTypeOther)

	var brahmicNuqta *string
	var brahmicHalant *string
	if fromData.ScriptType == scriptdata.ScriptTypeBrahmic && toData.ScriptType == scriptdata.ScriptTypeOther {
		brahmicNuqta = fromData.Nuqta
		h := fromData.Halant
		brahmicHalant = &h
	} else if fromData.ScriptType == scriptdata.ScriptTypeOther && toData.ScriptType == scriptdata.ScriptTypeBrahmic {
		brahmicNuqta = toData.Nuqta
		h := toData.Halant
		brahmicHalant = &h
	}

	useTypingMap := tOpts["normal_to_all:use_typing_chars"] || opts.TypingMode
	if useTypingMap && fromName == "Normal" {
		useTypingMap = true
	}
	var fromTextMap map[string]scriptdata.TextToKramaMap
	if useTypingMap && fromName == "Normal" {
		fromTextMap = toData.TypingTextMap
	} else {
		fromTextMap = fromData.TextMap
	}

	ignoreTaExtSupRuneIndex := -1
	runeCount := cursor.runeCount()

	// Hoist ctx so prevContextCleanup doesn't allocate a struct per call.
	ctx := &transliterateCtx{
		fromData: fromData, toData: toData,
		result: result, prevCtx: prevCtx,
		brahmicHalant: brahmicHalant, brahmicNuqta: brahmicNuqta,
		typingMode: opts.TypingMode, includeInherentVowel: opts.IncludeInherentVowel,
		transOptions: tOpts,
	}

	for cursor.pos < runeCount {
		textIndex := cursor.pos
		r, chWidth, ok := cursor.peek()
		if !ok {
			break
		}
		ch := string(r)

		if ignoreTaExtSupRuneIndex >= 0 && textIndex >= ignoreTaExtSupRuneIndex {
			ignoreTaExtSupRuneIndex = -1
			cursor.advanceRunes(1)
			continue
		}

		if strings.ContainsRune(charsToSkip, r) {
			cursor.advanceRunes(1)
			if prevContextInUse {
				prevContextCleanup(ctx, "", nil, nil, false)
				prevCtx.clear()
			}
			result.emit(ch)
			continue
		}

		if isSingleASCIIDigit(ch) && !opts.UseNativeNumerals {
			result.emit(ch)
			cursor.advanceRunes(1)
			prevContextCleanup(ctx, ch, nil, nil, false)
			continue
		}

		if tOpts["all_to_normal:preserve_specific_chars"] && toName == "Normal" {
			customArr := fromData.CustomScriptCharsArr
			if idx, ok := fromData.CustomScriptCharsLookup[ch]; ok {
				item := customArr[idx]
				prevText := item.Text
				var listRef *scriptdata.ListItem
				if item.FirstRef != nil {
					li := int(*item.FirstRef)
					if li >= 0 && li < len(fromData.List) {
						listRef = &fromData.List[li]
					}
				}
				prevContextCleanup(ctx, prevText, listRef, nil, false)
				normText := ""
				if item.SecondRef != nil {
					si := int(*item.SecondRef)
					entries := fromData.TypingTextMapEntries
					if si >= 0 && si < len(entries) {
						normText = entries[si].Text
					}
				}
				result.emit(normText)
				cursor.advanceRunes(utf8.RuneCountInString(prevText))
				continue
			}
		}

		var matchedText string
		var mapVal *scriptdata.TextToKramaMap
		searchBaseUnits := 1
		if chWidth > 1 {
			searchBaseUnits = 1
		}
		scanUnits := 0
		var lastValidVowelMatchVal *scriptdata.TextToKramaMap
		var lastValidVowelMatchText string
		checkVowelRetraction := prevContextInUse &&
			fromData.ScriptType == scriptdata.ScriptTypeOther &&
			toData.ScriptType == scriptdata.ScriptTypeBrahmic &&
			(prevCtx.typeAt(-1) != nil && listItemIsVyanjana(prevCtx.typeAt(-1)) ||
				brahmicNuqta != nil && prevCtx.typeAt(-2) != nil && listItemIsVyanjana(prevCtx.typeAt(-2)) &&
					prevCtx.textAt(-1) == *brahmicNuqta)

		for {
			nextR, _, nextROk := cursor.peekAtRune(textIndex + searchBaseUnits + scanUnits)
			if ignoreTaExtSupRuneIndex >= 0 && nextROk && isTaExtSuperscriptTailRune(nextR) {
				scanUnits++
				continue
			}
			endIdx := textIndex + searchBaseUnits + scanUnits
			if endIdx > 0 {
				_, w, _ := cursor.peekAtRune(endIdx - 1)
				if w == 2 {
					endIdx++
				}
			}
			charToSearch := ""
			if ignoreTaExtSupRuneIndex >= 0 {
				charToSearch = cursor.sliceRunes(textIndex, ignoreTaExtSupRuneIndex)
				if endIdx > ignoreTaExtSupRuneIndex {
					charToSearch += cursor.sliceRunes(ignoreTaExtSupRuneIndex+1, endIdx)
				}
			} else {
				charToSearch = cursor.sliceRunes(textIndex, endIdx)
			}
			potentialMatchVal, ok := fromTextMap[charToSearch]
			if !ok {
				mapVal = nil
				break
			}
			potentialMatch := &potentialMatchVal

			if checkVowelRetraction && len(potentialMatch.Krama) >= 1 {
				kid := potentialMatch.Krama[0]
				if kid >= 0 && int(kid) < len(toData.KramaTextArr) {
					kt := toData.KramaTextArr[kid]
					var listType *scriptdata.ListItem
					if kt.ListArrRef != nil {
						li := int(*kt.ListArrRef)
						if li >= 0 && li < len(toData.List) {
							listType = &toData.List[li]
						}
					}
					isSingleVowel := len(potentialMatch.Krama) == 1 &&
						(listItemIsSvara(listType) || listItemIsMatra(listType))
					if isSingleVowel {
						lastValidVowelMatchVal = potentialMatch
						lastValidVowelMatchText = charToSearch
					} else if lastValidVowelMatchVal != nil {
						matchedText = lastValidVowelMatchText
						mapVal = lastValidVowelMatchVal
						break
					}
				}
			}

			if len(potentialMatch.Next) > 0 {
				nthR, _, nthOk := cursor.peekAtRune(endIdx)
				if nthOk && containsStr(potentialMatch.Next, string(nthR)) {
					scanUnits++
					continue
				}
			}
			matchedText = charToSearch
			mapVal = potentialMatch
			break
		}

		if mapVal != nil {
			indexDeleteLen := 0
			if ignoreTaExtSupRuneIndex >= 0 && utf8.RuneCountInString(matchedText) > 1 {
				if len(mapVal.Krama) > 0 {
					ki := mapVal.Krama[0]
					if ki >= 0 && int(ki) < len(fromData.KramaTextArr) {
						kt := fromData.KramaTextArr[ki]
						var li *scriptdata.ListItem
						if kt.ListArrRef != nil {
							lidx := int(*kt.ListArrRef)
							if lidx >= 0 && lidx < len(fromData.List) {
								li = &fromData.List[lidx]
							}
						}
						if listItemIsVyanjana(li) && isTaExtSuperscriptTail(matchedText) {
							indexDeleteLen = 1
						}
					}
				}
			}
			matchedLenUnits := utf8.RuneCountInString(matchedText) - indexDeleteLen
			cursor.advanceRunes(matchedLenUnits)

			if tOpts["normal_to_all:use_typing_chars"] && mapVal.CustomBackRef != nil && *mapVal.CustomBackRef >= 0 {
				cb := int(*mapVal.CustomBackRef)
				if cb < len(toData.CustomScriptCharsArr) {
					customItem := toData.CustomScriptCharsArr[cb]
					result.emit(customItem.Text)
					var listItem *scriptdata.ListItem
					if customItem.FirstRef != nil {
						fi := int(*customItem.FirstRef)
						if fi >= 0 && fi < len(toData.List) {
							listItem = &toData.List[fi]
						}
					}
					prevContextCleanup(ctx, matchedText, listItem, mapVal.Next, false)
					continue
				}
			}

			hasValidKrama := false
			hasNegativeKrama := false
			for _, k := range mapVal.Krama {
				if k >= 0 {
					hasValidKrama = true
				}
				if k == -1 {
					hasNegativeKrama = true
				}
			}
			if hasValidKrama {
				pieces := make([]string, 0, len(mapVal.Krama))
				for _, k := range mapVal.Krama {
					if k >= 0 {
						pieces = append(pieces, kramaTextOrEmpty(toData, int(k)))
					}
				}
				resultText := strings.Join(pieces, "")
				resultConcat := false
				if prevContextInUse {
					if fromData.ScriptType == scriptdata.ScriptTypeBrahmic && toData.ScriptType == scriptdata.ScriptTypeOther {
						var item *scriptdata.ListItem
						if !tOpts["normal_to_all:use_typing_chars"] && mapVal.FallbackListRef != nil {
							fi := int(*mapVal.FallbackListRef)
							if fi >= 0 && fi < len(fromData.List) {
								item = &fromData.List[fi]
							}
						}
						if item == nil && len(mapVal.Krama) > 0 {
							k0 := mapVal.Krama[0]
							if k0 >= 0 && int(k0) < len(fromData.KramaTextArr) {
								kt := fromData.KramaTextArr[k0]
								if kt.ListArrRef != nil {
									li := int(*kt.ListArrRef)
									if li >= 0 && li < len(fromData.List) {
										item = &fromData.List[li]
									}
								}
							}
						}
						resultConcat = prevContextCleanup(ctx, matchedText, item, nil, false)
					} else if toData.ScriptType == scriptdata.ScriptTypeBrahmic && fromData.ScriptType == scriptdata.ScriptTypeOther {
						var item *scriptdata.ListItem
						if mapVal.FallbackListRef != nil {
							fi := int(*mapVal.FallbackListRef)
							if fi >= 0 && fi < len(toData.List) {
								item = &toData.List[fi]
							}
						}
						if item == nil && len(mapVal.Krama) > 0 {
							k0 := mapVal.Krama[0]
							if k0 >= 0 && int(k0) < len(toData.KramaTextArr) {
								kt := toData.KramaTextArr[k0]
								if kt.ListArrRef != nil {
									li := int(*kt.ListArrRef)
									if li >= 0 && li < len(toData.List) {
										item = &toData.List[li]
									}
								}
							}
						}
						var next []string
						if opts.TypingMode && fromName == "Normal" {
							next = mapVal.Next
						}
						resultConcat = prevContextCleanup(ctx, matchedText, item, next, false)
					} else if opts.TypingMode && fromName == "Normal" && toData.ScriptType == scriptdata.ScriptTypeOther {
						resultConcat = prevContextCleanup(ctx, matchedText, nil, mapVal.Next, false)
					}
				}
				if !resultConcat {
					toHalant := toData.Halant
					if toData.ScriptType == scriptdata.ScriptTypeBrahmic &&
						isScriptTamilExt(toName) && resultLastCharIsTaExtSuperscript(result) {
						lastKrama := int16(-1)
						if len(mapVal.Krama) > 0 {
							lastKrama = mapVal.Krama[len(mapVal.Krama)-1]
						}
						if resultText == toHalant || (lastKrama >= 0 && int(lastKrama) < len(toData.List) &&
							listItemIsMatra(&toData.List[lastKrama])) {
							emitPiecesWithReorder(result, pieces, toHalant, true)
						} else if len(pieces) > 0 && isVedicSvaraTail(pieces[len(pieces)-1]) {
							last, _ := result.popLastChar()
							result.emitPieces(pieces)
							result.emit(last)
						} else {
							result.emitPieces(pieces)
						}
					} else {
						result.emitPieces(pieces)
					}
				}
				applyCustomTransRules(fromData, toData, result, cursor, customRules, textIndex, -matchedLenUnits, ctx)
				continue
			} else if hasNegativeKrama {
				result.emit(matchedText)
				if opts.TypingMode {
					prevContextCleanup(ctx, matchedText, nil, mapVal.Next, false)
				}
				continue
			}
		} else {
			cursor.advanceRunes(1)
			textIndex = cursor.pos
		}

		charToSearch := ch
		if mapVal != nil {
			charToSearch = matchedText
		}
		index := kramaIndexOfText(fromData, charToSearch)
		if index < 0 {
			if prevContextInUse {
				prevContextCleanup(ctx, charToSearch, nil, nil, false)
				prevCtx.clear()
			}
			result.emit(charToSearch)
			continue
		}
		resultConcat := false
		if prevContextInUse {
			if fromData.ScriptType == scriptdata.ScriptTypeBrahmic {
				var li *scriptdata.ListItem
				if index < len(fromData.KramaTextArr) {
					kt := fromData.KramaTextArr[index]
					if kt.ListArrRef != nil {
						lidx := int(*kt.ListArrRef)
						if lidx >= 0 && lidx < len(fromData.List) {
							li = &fromData.List[lidx]
						}
					}
				}
				resultConcat = prevContextCleanup(ctx, charToSearch, li, nil, false)
			} else if toData.ScriptType == scriptdata.ScriptTypeBrahmic {
				var li *scriptdata.ListItem
				if index < len(toData.KramaTextArr) {
					kt := toData.KramaTextArr[index]
					if kt.ListArrRef != nil {
						lidx := int(*kt.ListArrRef)
						if lidx >= 0 && lidx < len(toData.List) {
							li = &toData.List[lidx]
						}
					}
				}
				resultConcat = prevContextCleanup(ctx, charToSearch, li, nil, false)
			}
		}
		if !resultConcat {
			toAdd := kramaTextOrEmpty(toData, index)
			if toData.ScriptType == scriptdata.ScriptTypeBrahmic &&
				isScriptTamilExt(toName) && resultLastCharIsTaExtSuperscript(result) {
				var li *scriptdata.ListItem
				if index < len(toData.KramaTextArr) {
					kt := toData.KramaTextArr[index]
					if kt.ListArrRef != nil {
						lidx := int(*kt.ListArrRef)
						if lidx >= 0 && lidx < len(toData.List) {
							li = &toData.List[lidx]
						}
					}
				}
				if toAdd == toData.Halant || listItemIsMatra(li) {
					emitPiecesWithReorder(result, []string{toAdd}, toData.Halant, true)
				} else if isVedicSvaraTail(toAdd) {
					last, _ := result.popLastChar()
					result.emit(toAdd)
					result.emit(last)
				} else {
					result.emit(toAdd)
				}
			} else {
				result.emit(toAdd)
			}
		}
		applyCustomTransRules(fromData, toData, result, cursor, customRules, textIndex, -1, ctx)
	}

	if prevContextInUse {
		prevContextCleanup(ctx, "", nil, nil, true)
	}
	output := result.toString()
	output = applyCustomReplaceRules(output, toData, customRules, scriptdata.CheckInOutput)
	return TransliterateOutput{Output: output, ContextLength: prevCtx.length()}, nil
}

type transliterateCtx struct {
	fromData             *scriptdata.ScriptData
	toData               *scriptdata.ScriptData
	result               *resultStringBuilder
	prevCtx              *prevContextBuilder
	brahmicHalant        *string
	brahmicNuqta         *string
	typingMode           bool
	includeInherentVowel bool
	transOptions         map[string]bool
}

func prevContextCleanup(
	ctx *transliterateCtx,
	itemText string,
	itemType *scriptdata.ListItem,
	next []string,
	lastExtraCall bool,
) bool {
	brahmicHalant := ""
	if ctx.brahmicHalant != nil {
		brahmicHalant = *ctx.brahmicHalant
	}
	brahmicNuqta := ""
	if ctx.brahmicNuqta != nil {
		brahmicNuqta = *ctx.brahmicNuqta
	}
	resultConcat := false
	if ctx.brahmicNuqta != nil &&
		listItemIsVyanjana(ctx.prevCtx.typeAt(-3)) &&
		ctx.prevCtx.textAt(-2) == brahmicNuqta &&
		listItemIsMatra(ctx.prevCtx.typeAt(-1)) ||
		listItemIsVyanjana(ctx.prevCtx.typeAt(-2)) &&
			listItemIsMatra(ctx.prevCtx.typeAt(-1)) {
		if itemType == nil || listItemIsAnya(itemType) {
			ctx.prevCtx.clear()
		}
	}
	if ctx.fromData.ScriptType == scriptdata.ScriptTypeBrahmic &&
		ctx.toData.ScriptType == scriptdata.ScriptTypeOther {
		taExtOk := true
		if isScriptTamilExt(ctx.fromData.ScriptName) && itemText != "" {
			taExtOk = !strings.HasPrefix(itemText, brahmicHalant)
		}
		vyanjanaCase := (ctx.brahmicNuqta == nil || itemText != brahmicNuqta) &&
			(listItemIsVyanjana(ctx.prevCtx.typeAt(-1)) ||
				ctx.brahmicHalant != nil && listItemIsVyanjana(ctx.prevCtx.typeAt(-2)) &&
					ctx.prevCtx.textAt(-1) == brahmicNuqta)
		toAnyaOrNull := (!listItemIsMatra(itemType) && itemText != brahmicHalant) ||
			listItemIsAnya(itemType) || itemType == nil
		if itemText != brahmicHalant && taExtOk && vyanjanaCase && toAnyaOrNull {
			ctx.result.emit(ctx.toData.SchwaCharacter)
		}
	} else if ctx.fromData.ScriptType == scriptdata.ScriptTypeOther &&
		ctx.toData.ScriptType == scriptdata.ScriptTypeBrahmic {
		if listItemIsVyanjana(ctx.prevCtx.typeAt(-1)) &&
			(listItemIsMatra(itemType) || listItemIsSvara(itemType)) {
			linkedMatra := itemText
			if itemType != nil && itemType.Type == "svara" {
				if len(itemType.MatraKramaRef) > 0 {
					kr := itemType.MatraKramaRef[0]
					linkedMatra = kramaTextOrEmpty(ctx.toData, int(kr))
				} else {
					linkedMatra = ""
				}
			}
			emitPiecesWithReorder(ctx.result, []string{linkedMatra}, ctx.toData.Halant,
				isScriptTamilExt(ctx.toData.ScriptName) && resultLastCharIsTaExtSuperscript(ctx.result))
			resultConcat = true
		} else if !ctx.includeInherentVowel &&
			listItemIsVyanjana(ctx.prevCtx.typeAt(-1)) &&
			!(itemText == brahmicHalant || listItemIsMatra(itemType)) {
			shouldReorder := isScriptTamilExt(ctx.toData.ScriptName) &&
				resultLastCharIsTaExtSuperscript(ctx.result)
			emitPiecesWithReorder(ctx.result, []string{brahmicHalant}, ctx.toData.Halant, shouldReorder)
			if ctx.toData.ScriptName == "Sinhala" &&
				transOpt(ctx.transOptions, "all_to_sinhala:use_conjunct_enabling_halant") {
				lp := ctx.result.lastPiece()
				ctx.result.rewriteAt(-1, lp+"\u200d")
			}
		} else if ctx.includeInherentVowel && itemType != nil && listItemIsVyanjana(itemType) &&
			(listItemIsVyanjana(ctx.prevCtx.typeAt(-1)) ||
				ctx.brahmicNuqta != nil && listItemIsVyanjana(ctx.prevCtx.typeAt(-2)) &&
					ctx.prevCtx.textAt(-1) == brahmicNuqta) {
			shouldReorder := isScriptTamilExt(ctx.toData.ScriptName) &&
				resultLastCharIsTaExtSuperscript(ctx.result)
			emitPiecesWithReorder(ctx.result, []string{brahmicHalant}, ctx.toData.Halant, shouldReorder)
			if ctx.toData.ScriptName == "Sinhala" &&
				transOpt(ctx.transOptions, "all_to_sinhala:use_conjunct_enabling_halant") {
				lp := ctx.result.lastPiece()
				ctx.result.rewriteAt(-1, lp+"\u200d")
			}
		}
	}
	toClear := false
	if ctx.typingMode && len(next) == 0 && !lastExtraCall &&
		!(isScriptTamilExt(ctx.toData.ScriptName) && resultLastCharIsTaExtSuperscript(ctx.result)) {
		toClear = true
		if itemType != nil && listItemIsVyanjana(itemType) {
			toClear = false
		}
		if toClear {
			ctx.prevCtx.clear()
		}
	}
	if !ctx.typingMode || (!lastExtraCall && !toClear) {
		if itemText != "" || itemType != nil {
			ctx.prevCtx.push(itemText, itemType)
		}
	}
	return resultConcat
}

func applyCustomTransRules(
	fromData, toData *scriptdata.ScriptData,
	result *resultStringBuilder,
	cursor *inputCursor,
	rules []scriptdata.Rule,
	textIndex, delta int,
	ctx *transliterateCtx,
) {
	currentIdx := textIndex + delta
	for _, rule := range rules {
		if rule.UseReplace != nil && *rule.UseReplace {
			continue
		}
		switch rule.Type {
		case "replace_prev_krama_keys":
			prevUsize, ok := i16ToIntSlice(rule.Prev)
			if !ok {
				continue
			}
			if rule.CheckIn != nil && *rule.CheckIn == scriptdata.CheckInOutput {
				lp := result.lastPiece()
				if lp == "" {
					continue
				}
				followIdx := kramaIndexOfText(toData, lp)
				if followIdx < 0 {
					continue
				}
				followI16 := int16(followIdx)
				found := false
				for _, f := range rule.Following {
					if f == followI16 {
						found = true
						break
					}
				}
				if !found {
					continue
				}
				peekAt := func(i int) (string, bool) {
					return result.peekAt(i)
				}
				matched, mLen := matchPrevKramaSequence(peekAt, -2, prevUsize, toData)
				if matched {
					pieces := replaceWithPieces(rule.ReplaceWith, toData)
					pieces = append(pieces, lp)
					result.rewriteTailPieces(mLen+1, pieces)
				}
			} else {
				if currentIdx < 0 {
					continue
				}
				cursorPeek := func(i int) (string, bool) {
					r, _, ok := cursor.peekAtRune(i)
					if !ok {
						return "", false
					}
					return string(r), ok
				}
				matched, mLen := matchPrevKramaSequence(cursorPeek, currentIdx, prevUsize, fromData)
				if !matched {
					continue
				}
				nextR, _, ok := cursor.peekAtRune(textIndex)
				if !ok {
					continue
				}
				nextIdx := kramaIndexOfText(fromData, string(nextR))
				if nextIdx < 0 {
					continue
				}
				nextI16 := int16(nextIdx)
				found := false
				for _, f := range rule.Following {
					if f == nextI16 {
						found = true
						break
					}
				}
				if !found {
					continue
				}
				pieces := replaceWithPieces(rule.ReplaceWith, toData)
				result.rewriteTailPieces(mLen, pieces)
			}
		case "direct_replace":
			lookup := fromData
			if rule.CheckIn != nil && *rule.CheckIn == scriptdata.CheckInOutput {
				lookup = toData
			}
			for _, grp := range rule.ToReplace {
				sgUsize, ok := i16ToIntSlice(grp)
				if !ok {
					continue
				}
				peekAt := func(i int) (string, bool) {
					return result.peekAt(i)
				}
				matched, mLen := matchPrevKramaSequence(peekAt, -1, sgUsize, lookup)
				if !matched {
					continue
				}
				if rule.ReplaceText != nil {
					result.rewriteTailPieces(mLen, []string{*rule.ReplaceText})
				} else {
					pieces := replaceWithPieces(rule.ReplaceWith, lookup)
					result.rewriteTailPieces(mLen, pieces)
				}
				break
			}
		}
	}
}

func containsStr(s []string, v string) bool {
	for _, x := range s {
		if x == v {
			return true
		}
	}
	return false
}

func isSingleASCIIDigit(s string) bool {
	// Use utf8.DecodeRuneInString to avoid allocating a []rune slice.
	r, size := utf8.DecodeRuneInString(s)
	if r == utf8.RuneError || size != len(s) {
		return false
	}
	return r >= '0' && r <= '9'
}

func resultLastCharIsTaExtSuperscript(result *resultStringBuilder) bool {
	r, ok := result.LastChar()
	return ok && isTaExtSuperscriptTailRune(r)
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
	resolved := resolveTransliterationRules(&fromData, &toData, customOpts, transOptions)
	out, err := TransliterateTextCore(
		text, fromNorm, toNorm,
		&fromData, &toData,
		resolved.TransOptions, resolved.CustomRules,
		nil,
	)
	if err != nil {
		return "", err
	}
	return out.Output, nil
}
