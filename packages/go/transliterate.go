package lipilekhika

import (
	"errors"
	"sort"
	"strings"

	"lipilekhika/scriptdata"
)

/** These Characters can be skipped/ignore while transliterating the input text */
var charsToSkip = map[string]bool{
	" ":  true,
	"\n": true,
	"\r": true,
	"\t": true,
	",":  true,
	";":  true,
	"!":  true,
	"@":  true,
	"?":  true,
	"%":  true,
}

var tamilExtendedSuperscriptNumbers = map[string]bool{
	"²": true,
	"³": true,
	"⁴": true,
}

type TransliterationOptions map[string]bool

// PreloadScriptData loads and caches a script JSON from embedded data.
func PreloadScriptData(name string) error {
	normalized, ok := GetNormalizedScriptName(name)
	if !ok {
		return errors.New("invalid script name: " + name)
	}
	_, err := getScriptData(normalized)
	return err
}

// Transliterate is the library entry point, mirroring packages/js/src/index.ts:transliterate.
func Transliterate(text, from, to string, options TransliterationOptions) (string, error) {
	normalizedFrom, ok := GetNormalizedScriptName(from)
	if !ok {
		return "", errors.New("invalid script name: " + from)
	}
	normalizedTo, ok := GetNormalizedScriptName(to)
	if !ok {
		return "", errors.New("invalid script name: " + to)
	}
	if normalizedFrom == normalizedTo {
		return text, nil
	}
	out, _, err := transliterateText(text, normalizedFrom, normalizedTo, options)
	return out, err
}

// GetAllOptions mirrors packages/js/src/index.ts:getAllOptions.
func GetAllOptions(from, to string) ([]string, error) {
	normalizedFrom, ok := GetNormalizedScriptName(from)
	if !ok {
		return nil, errors.New("invalid script name: " + from)
	}
	normalizedTo, ok := GetNormalizedScriptName(to)
	if !ok {
		return nil, errors.New("invalid script name: " + to)
	}
	fromSD, err := getScriptData(normalizedFrom)
	if err != nil {
		return nil, err
	}
	toSD, err := getScriptData(normalizedTo)
	if err != nil {
		return nil, err
	}

	all, err := getCustomOptions()
	if err != nil {
		return nil, err
	}
	// enable all options
	in := map[string]bool{}
	for k := range all {
		in[k] = true
	}
	active := getActiveCustomOptions(all, string(fromSD.ScriptType), fromSD.ScriptName, string(toSD.ScriptType), toSD.ScriptName, in)
	keys := make([]string, 0, len(active))
	for k := range active {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys, nil
}

func transliterateText(
	text string,
	fromScriptName string,
	toScriptName string,
	inputOptions TransliterationOptions,
) (output string, contextLen int, err error) {
	fromSD, err := getScriptData(fromScriptName)
	if err != nil {
		return "", 0, err
	}
	toSD, err := getScriptData(toScriptName)
	if err != nil {
		return "", 0, err
	}

	allOptions, err := getCustomOptions()
	if err != nil {
		return "", 0, err
	}
	activeOptions := getActiveCustomOptions(
		allOptions,
		string(fromSD.ScriptType),
		fromSD.ScriptName,
		string(toSD.ScriptType),
		toSD.ScriptName,
		inputOptions,
	)

	// Collect custom rules in deterministic order (sorted keys). JS uses object insertion order;
	// fixture options are non-overlapping so this is expected to be safe and stable.
	activeKeys := make([]string, 0, len(activeOptions))
	for k := range activeOptions {
		activeKeys = append(activeKeys, k)
	}
	sort.Strings(activeKeys)
	customRules := make([]customRule, 0, 8)
	for _, k := range activeKeys {
		customRules = append(customRules, allOptions[k].Rules...)
	}

	text = applyCustomReplaceRules(text, fromSD, customRules, checkInInput)

	result := newStringBuilder()
	cursor := makeInputCursor(text)

	const maxContextLength = 5
	prevCtx := newPrevContext(maxContextLength)
	prevContextInUse := (fromSD.ScriptType == scriptdata.ScriptTypeBrahmic && toSD.ScriptType == scriptdata.ScriptTypeOther) ||
		(fromSD.ScriptType == scriptdata.ScriptTypeOther && toSD.ScriptType == scriptdata.ScriptTypeBrahmic)

	var brahmicNuqta string
	if fromSD.ScriptType == scriptdata.ScriptTypeBrahmic && toSD.ScriptType == scriptdata.ScriptTypeOther {
		brahmicNuqta = fromSD.Nuqta
	} else if fromSD.ScriptType == scriptdata.ScriptTypeOther && toSD.ScriptType == scriptdata.ScriptTypeBrahmic {
		brahmicNuqta = toSD.Nuqta
	}
	var brahmicHalant string
	if fromSD.ScriptType == scriptdata.ScriptTypeBrahmic && toSD.ScriptType == scriptdata.ScriptTypeOther {
		brahmicHalant = fromSD.Halant
	} else if fromSD.ScriptType == scriptdata.ScriptTypeOther && toSD.ScriptType == scriptdata.ScriptTypeBrahmic {
		brahmicHalant = toSD.Halant
	}

	prevCleanup := func(itemText string, item *scriptdata.ListItem) (resultConcatStatus bool) {
		// Custom cleanup logic/cases ported from JS.
		shouldClear := (((brahmicNuqta != "" &&
			prevCtx.TypeAt(-3) == "vyanjana" &&
			prevCtx.TextAt(-2) == brahmicNuqta &&
			prevCtx.TypeAt(-1) == "mAtrA") ||
			(prevCtx.TypeAt(-2) == "vyanjana" && prevCtx.TypeAt(-1) == "mAtrA")) &&
			(item == nil || item.Type == "anya"))
		if shouldClear {
			prevCtx.Clear()
		}

		if fromSD.ScriptType == scriptdata.ScriptTypeBrahmic && toSD.ScriptType == scriptdata.ScriptTypeOther {
			// custom logic when converting from brahmic to other
			itemFirstUnit := ""
			if itemText != "" {
				itemFirstUnit = utf16SliceByUnits(itemText, 0, 1)
			}
			condTamilExtHalantFirstUnitOk := (fromScriptName != "Tamil-Extended" || itemText == "" || itemFirstUnit != brahmicHalant)
			condPrevIsVyanjana := prevCtx.TypeAt(-1) == "vyanjana" ||
				(brahmicNuqta != "" && prevCtx.TypeAt(-2) == "vyanjana" && prevCtx.TextAt(-1) == brahmicNuqta)
			condItemAllowsSchwa := ((item == nil || item.Type != "mAtrA") && itemText != brahmicHalant) ||
				(item != nil && item.Type == "anya") ||
				item == nil

			if itemText != brahmicHalant &&
				condTamilExtHalantFirstUnitOk &&
				(brahmicNuqta == "" || itemText != brahmicNuqta) &&
				condPrevIsVyanjana &&
				condItemAllowsSchwa {
				result.Emit(toSD.SchwaCharacter)
			}
		} else if fromSD.ScriptType == scriptdata.ScriptTypeOther && toSD.ScriptType == scriptdata.ScriptTypeBrahmic {
			// custom logic when converting from other to brahmic
			if prevCtx.TypeAt(-1) == "vyanjana" && (item != nil && (item.Type == "mAtrA" || item.Type == "svara")) {
				linkedMatra := ""
				if item.Type == "svara" {
					if item.MatraKramaRef != nil && len(*item.MatraKramaRef) > 0 {
						linkedMatra = toSD.KramaTextOrEmpty((*item.MatraKramaRef)[0])
					}
				} else {
					linkedMatra = itemText
				}

				if toScriptName == "Tamil-Extended" && tamilExtendedSuperscriptNumbers[result.LastChar()] {
					if linkedMatra != "" && utf16SliceByUnits(linkedMatra, 0, 1) == toSD.Halant {
						result.WithLastCharMovedAfter([]string{toSD.Halant}, []string{utf16SliceByUnits(linkedMatra, 1, len(utf16EncodeString(linkedMatra)))})
					} else {
						result.WithLastCharMovedAfter([]string{linkedMatra}, nil)
					}
				} else {
					result.Emit(linkedMatra)
				}
				resultConcatStatus = true
			} else if prevCtx.TypeAt(-1) == "vyanjana" && !(itemText == brahmicHalant || (item != nil && item.Type == "mAtrA")) {
				if toScriptName == "Tamil-Extended" && tamilExtendedSuperscriptNumbers[result.LastChar()] {
					result.WithLastCharMovedAfter([]string{brahmicHalant}, nil)
				} else {
					result.Emit(brahmicHalant)
				}
			}
		}

		prevCtx.Push(itemText, item)
		return resultConcatStatus
	}

	applyCustomRules := func(textIndex int, delta int) {
		currentTextIndex := textIndex + delta
		for _, rule := range customRules {
			if rule.UseReplace {
				continue
			}
			if rule.CheckIn == checkInOutput {
				continue
			}
			if rule.Type != ruleTypeReplacePrevKramaKeys {
				continue
			}

			prevExists := true
			prevMatchedIndexes := make([]int, 0, len(rule.Prev))
			for i := 0; i < len(rule.Prev); i++ {
				prevKramaIdx := rule.Prev[len(rule.Prev)-1-i]
				curInfo := cursor.PeekAt(currentTextIndex - i)
				if curInfo == nil {
					prevExists = false
					break
				}
				curChar := curInfo.Ch
				curCharKrama := binarySearchLowerWithIndexKramaText(fromSD.KramaTextArr, fromSD.KramaTextArrIndex, curChar)
				if curCharKrama == -1 || curCharKrama != prevKramaIdx {
					prevExists = false
					break
				}
				prevMatchedIndexes = append(prevMatchedIndexes, curCharKrama)
			}

			nextInfo := cursor.PeekAt(textIndex)
			if prevExists && nextInfo != nil {
				nextChar := nextInfo.Ch
				nextKrama := binarySearchLowerWithIndexKramaText(fromSD.KramaTextArr, fromSD.KramaTextArrIndex, nextChar)
				if nextKrama != -1 {
					found := false
					for _, f := range rule.Following {
						if f == nextKrama {
							found = true
							break
						}
					}
					if found {
						replacePieces := make([]string, 0, len(rule.ReplaceWith))
						for _, r := range rule.ReplaceWith {
							if s := toSD.KramaTextOrEmpty(r); s != "" {
								replacePieces = append(replacePieces, s)
							}
						}
						result.RewriteTailPieces(len(prevMatchedIndexes), replacePieces)
					}
				}
			}
		}
	}

	ignoreTaExtSupNumTextIndex := -1

	for cursor.pos < cursor.LenUnits() {
		textIndex := cursor.pos
		cur := cursor.Peek()
		if cur == nil {
			break
		}
		char := cur.Ch
		charWidth := cur.Width

		// Preserve legacy matching semantics: Step-1 matcher uses +1 for surrogate pairs.
		searchBaseUnits := charWidth
		if charWidth == 2 {
			searchBaseUnits = 1
		}

		if ignoreTaExtSupNumTextIndex != -1 && textIndex >= ignoreTaExtSupNumTextIndex {
			ignoreTaExtSupNumTextIndex = -1
			cursor.Advance(charWidth)
			continue
		}

		if charsToSkip[char] {
			cursor.Advance(charWidth)
			if prevContextInUse {
				prevCleanup(" ", nil)
				prevCtx.Clear()
			}
			result.Emit(char)
			continue
		}

		// Step 1: Search in text_to_krama_map
		textToKramaItemIndex := -1
		{
			scanUnits := 0
			lastValidVowelMatchIndex := -1
			checkVowelRetraction :=
				prevContextInUse &&
					toSD.ScriptType == scriptdata.ScriptTypeBrahmic &&
					(prevCtx.TypeAt(-1) == "vyanjana" ||
						(brahmicNuqta != "" && prevCtx.TypeAt(-2) == "vyanjana" && prevCtx.TextAt(-1) == brahmicNuqta))

			for {
				next := cursor.PeekAt(textIndex + searchBaseUnits + scanUnits)
				nextChar := ""
				if next != nil {
					nextChar = next.Ch
				}
				if ignoreTaExtSupNumTextIndex != -1 && nextChar != "" && tamilExtendedSuperscriptNumbers[nextChar] {
					scanUnits += next.Width
				}

				endIndex := textIndex + searchBaseUnits + scanUnits
				charToSearch := ""
				if ignoreTaExtSupNumTextIndex != -1 {
					charToSearch = cursor.Slice(textIndex, ignoreTaExtSupNumTextIndex)
					if endIndex > ignoreTaExtSupNumTextIndex {
						charToSearch += cursor.Slice(ignoreTaExtSupNumTextIndex+1, endIndex)
					}
				} else {
					charToSearch = cursor.Slice(textIndex, endIndex)
				}

				potentialMatchIndex := binarySearchLowerTextToKrama(fromSD.TextToKramaMap, charToSearch)
				if potentialMatchIndex == -1 {
					textToKramaItemIndex = -1
					break
				}
				potentialMatch := fromSD.TextToKramaMap[potentialMatchIndex]

				if checkVowelRetraction && potentialMatch.Info.Krama != nil && len(*potentialMatch.Info.Krama) >= 1 {
					krama := *potentialMatch.Info.Krama
					kramaID := krama[0]
					listItem := toSD.ListItemAtKramaIndex(kramaID)
					listType := ""
					if listItem != nil {
						listType = listItem.Type
					}
					isSingleVowel := len(krama) == 1 && listItem != nil && (listType == "svara" || listType == "mAtrA")
					if isSingleVowel {
						lastValidVowelMatchIndex = potentialMatchIndex
					} else if lastValidVowelMatchIndex != -1 {
						textToKramaItemIndex = lastValidVowelMatchIndex
						break
					}
				}

				if len(potentialMatch.Info.Next) > 0 {
					nthNext := cursor.PeekAt(endIndex)
					nthNextChar := ""
					if nthNext != nil {
						nthNextChar = nthNext.Ch
					}

					if fromScriptName == "Tamil-Extended" && fromSD.ScriptType == scriptdata.ScriptTypeBrahmic {
						var n1, n2 *cursorCp
						if nthNext != nil {
							n1 = cursor.PeekAt(endIndex + nthNext.Width)
						}
						if nthNext != nil && n1 != nil {
							n2 = cursor.PeekAt(endIndex + nthNext.Width + n1.Width)
						}
						n1Ch := ""
						if n1 != nil {
							n1Ch = n1.Ch
						}
						n2Ch := ""
						if n2 != nil {
							n2Ch = n2.Ch
						}

						containsNext := func(ch string) bool {
							for _, s := range potentialMatch.Info.Next {
								if s == ch {
									return true
								}
							}
							return false
						}

						if ignoreTaExtSupNumTextIndex == -1 && n1Ch != "" && tamilExtendedSuperscriptNumbers[n1Ch] && containsNext(n1Ch) {
							charIndex := binarySearchLowerTextToKrama(fromSD.TextToKramaMap, charToSearch+n1Ch)
							nthKramaIdx := binarySearchLowerWithIndexKramaText(fromSD.KramaTextArr, fromSD.KramaTextArrIndex, nthNextChar)
							if charIndex != -1 && nthKramaIdx != -1 {
								textToKramaItemIndex = charIndex
								nthType := ""
								if li := fromSD.ListItemAtKramaIndex(nthKramaIdx); li != nil {
									nthType = li.Type
								}
								if nthNextChar == fromSD.Halant || nthType == "mAtrA" {
									ignoreTaExtSupNumTextIndex = endIndex + nthNext.Width
									break
								}
							}
						} else if ignoreTaExtSupNumTextIndex == -1 && n2Ch != "" && tamilExtendedSuperscriptNumbers[n2Ch] && containsNext(n2Ch) {
							charIndex := binarySearchLowerTextToKrama(fromSD.TextToKramaMap, charToSearch+n2Ch)
							nthKramaIdx := binarySearchLowerWithIndexKramaText(fromSD.KramaTextArr, fromSD.KramaTextArrIndex, nthNextChar)
							n1KramaIdx := binarySearchLowerWithIndexKramaText(fromSD.KramaTextArr, fromSD.KramaTextArrIndex, n1Ch)
							if charIndex != -1 && nthKramaIdx != -1 && n1KramaIdx != -1 {
								textToKramaItemIndex = charIndex
								nthType := ""
								if li := fromSD.ListItemAtKramaIndex(nthKramaIdx); li != nil {
									nthType = li.Type
								}
								n1Type := ""
								if li := fromSD.ListItemAtKramaIndex(n1KramaIdx); li != nil {
									n1Type = li.Type
								}
								if nthType == "mAtrA" && n1Type == "mAtrA" {
									ignoreTaExtSupNumTextIndex = endIndex + nthNext.Width + n1.Width
									break
								}
							}
						}
					}

					if nthNextChar != "" {
						// if next is in next list, extend scan
						found := false
						for _, s := range potentialMatch.Info.Next {
							if s == nthNextChar {
								found = true
								break
							}
						}
						if found {
							if nthNext != nil {
								scanUnits += nthNext.Width
								continue
							}
						}
					}
				}

				textToKramaItemIndex = potentialMatchIndex
				break
			}
		}

		var textToKramaItem *scriptdata.TextToKramaEntry
		if textToKramaItemIndex != -1 {
			textToKramaItem = &fromSD.TextToKramaMap[textToKramaItemIndex]
		}

		if textToKramaItem != nil {
			indexDeleteLength := 0
			if ignoreTaExtSupNumTextIndex != -1 {
				if utf16LenUnits(textToKramaItem.Text) > 1 && textToKramaItem.Info.Krama != nil && len(*textToKramaItem.Info.Krama) > 0 {
					firstKrama := (*textToKramaItem.Info.Krama)[0]
					li := fromSD.ListItemAtKramaIndex(firstKrama)
					if li != nil && li.Type == "vyanjana" {
						lastUnit := utf16SliceByUnits(textToKramaItem.Text, utf16LenUnits(textToKramaItem.Text)-1, utf16LenUnits(textToKramaItem.Text))
						if tamilExtendedSuperscriptNumbers[lastUnit] {
							indexDeleteLength = 1
						}
					}
				}
			}

			matchedLenUnits := utf16LenUnits(textToKramaItem.Text) - indexDeleteLength
			cursor.Advance(matchedLenUnits)
			textIndex = cursor.pos

			if textToKramaItem.Info.Krama != nil {
				krama := *textToKramaItem.Info.Krama
				resultPieces := make([]string, 0, len(krama))
				for _, k := range krama {
					resultPieces = append(resultPieces, toSD.KramaTextOrEmpty(k))
				}
				resultText := strings.Join(resultPieces, "")

				resultConcatStatus := false
				if prevContextInUse {
					if fromSD.ScriptType == scriptdata.ScriptTypeBrahmic {
						var itemLi *scriptdata.ListItem
						if textToKramaItem.Info.FallbackListRef != nil {
							ref := *textToKramaItem.Info.FallbackListRef
							if ref >= 0 && ref < len(fromSD.List) {
								itemLi = &fromSD.List[ref]
							}
						} else {
							if len(krama) == 0 {
								itemLi = nil
							} else {
								listRefs := make([]*scriptdata.ListItem, 0, len(krama))
								for _, k := range krama {
									listRefs = append(listRefs, fromSD.ListItemAtKramaIndex(k))
								}
								if fromScriptName == "Tamil-Extended" {
									hasMatra := false
									hasVyanjana := false
									hasNil := false
									for _, li := range listRefs {
										if li == nil {
											hasNil = true
											continue
										}
										if li.Type == "mAtrA" {
											hasMatra = true
										}
										if li.Type == "vyanjana" {
											hasVyanjana = true
										}
									}
									if hasMatra && hasVyanjana && listRefs[0] != nil {
										tmp := *listRefs[0]
										tmp.Type = "anya"
										itemLi = &tmp
									} else if len(listRefs) > 1 && hasNil {
										itemLi = listRefs[len(listRefs)-1]
									} else {
										itemLi = listRefs[0]
									}
								} else {
									itemLi = listRefs[0]
								}
							}
						}
						resultConcatStatus = prevCleanup(textToKramaItem.Text, itemLi)
					} else if toSD.ScriptType == scriptdata.ScriptTypeBrahmic {
						var itemLi *scriptdata.ListItem
						if textToKramaItem.Info.FallbackListRef != nil {
							ref := *textToKramaItem.Info.FallbackListRef
							if ref >= 0 && ref < len(toSD.List) {
								itemLi = &toSD.List[ref]
							}
						} else if len(krama) > 0 {
							itemLi = toSD.ListItemAtKramaIndex(krama[0])
						}
						resultConcatStatus = prevCleanup(textToKramaItem.Text, itemLi)
					}
				}

				if !resultConcatStatus {
					if toSD.ScriptType == scriptdata.ScriptTypeBrahmic &&
						toScriptName == "Tamil-Extended" &&
						((len(krama) > 0 && func() bool {
							li := toSD.ListItemAtKramaIndex(krama[len(krama)-1])
							return li != nil && li.Type == "mAtrA"
						}()) || resultText == toSD.Halant) &&
						tamilExtendedSuperscriptNumbers[result.LastChar()] {
						firstPiece := ""
						if len(resultPieces) > 0 {
							firstPiece = resultPieces[0]
						}
						if firstPiece != "" && utf16SliceByUnits(firstPiece, 0, 1) == toSD.Halant {
							restFirst := utf16SliceByUnits(firstPiece, 1, utf16LenUnits(firstPiece))
							afterPieces := make([]string, 0, len(resultPieces))
							if restFirst != "" {
								afterPieces = append(afterPieces, restFirst)
							}
							for i := 1; i < len(resultPieces); i++ {
								afterPieces = append(afterPieces, resultPieces[i])
							}
							result.WithLastCharMovedAfter([]string{toSD.Halant}, afterPieces)
						} else {
							result.WithLastCharMovedAfter(resultPieces, nil)
						}
					} else {
						result.EmitPieces(resultPieces)
					}
				}

				applyCustomRules(textIndex, -matchedLenUnits)
				continue
			}
		} else {
			cursor.Advance(charWidth)
			textIndex = cursor.pos
		}

		// Step 2: Search in krama_text_arr
		charToSearch := char
		if textToKramaItem != nil {
			charToSearch = textToKramaItem.Text
		}
		index := binarySearchLowerWithIndexKramaText(fromSD.KramaTextArr, fromSD.KramaTextArrIndex, charToSearch)
		if index == -1 {
			if prevContextInUse {
				prevCleanup(charToSearch, nil)
				prevCtx.Clear()
			}
			result.Emit(charToSearch)
			continue
		}

		resultConcatStatus := false
		if prevContextInUse {
			if fromSD.ScriptType == scriptdata.ScriptTypeBrahmic {
				resultConcatStatus = prevCleanup(charToSearch, fromSD.ListItemAtKramaIndex(index))
			} else if toSD.ScriptType == scriptdata.ScriptTypeBrahmic {
				resultConcatStatus = prevCleanup(charToSearch, toSD.ListItemAtKramaIndex(index))
			}
		}

		if !resultConcatStatus {
			toAddText := toSD.KramaTextOrEmpty(index)
			if toSD.ScriptType == scriptdata.ScriptTypeBrahmic &&
				toScriptName == "Tamil-Extended" &&
				(func() bool {
					li := toSD.ListItemAtKramaIndex(index)
					return (li != nil && li.Type == "mAtrA") || toAddText == toSD.Halant
				}()) &&
				tamilExtendedSuperscriptNumbers[result.LastChar()] {
				if toAddText != "" && utf16SliceByUnits(toAddText, 0, 1) == toSD.Halant {
					result.WithLastCharMovedAfter([]string{toSD.Halant}, []string{utf16SliceByUnits(toAddText, 1, utf16LenUnits(toAddText))})
				} else {
					result.WithLastCharMovedAfter([]string{toAddText}, nil)
				}
			} else {
				result.Emit(toAddText)
			}
		}

		applyCustomRules(textIndex, -charWidth)
	}

	if prevContextInUse {
		prevCleanup("", nil)
	}

	out := result.String()
	out = applyCustomReplaceRules(out, toSD, customRules, checkInOutput)
	return out, prevCtx.Len(), nil
}

func utf16LenUnits(s string) int {
	return len(utf16EncodeString(s))
}
