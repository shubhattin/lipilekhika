package transliterate

import (
	"strings"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/internal/scriptdata"
)

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

// applyCustomTransRules applies the custom rules after a match (`nextInMatch` is nil), or between
// two pieces of one match (only the rules that can apply there: `direct_replace` and the input
// side `replace_prev_krama_keys`), `nextInMatch` then is the krama of the next piece.
//
//   - `matchStart`: index of the first character of the match in the input
//   - `nextIndex`: index of the character after the match (read when `nextInMatch` is nil)
//   - `matchKrama`: the krama of the match read so far (all of it after the match)
func (ctx *transliterateCtx) applyCustomTransRules(
	matchStart, nextIndex int,
	matchKrama []int16,
	nextInMatch *int16,
) {
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
				ctx.applyPrevKramaRuleOnInput(rule, matchStart, nextIndex, matchKrama, nextInMatch)
			} else if nextInMatch == nil {
				// the output side rule sees whole matches only, not the pieces of one
				ctx.applyPrevKramaRuleOnOutput(rule)
			}
		case "direct_replace":
			ctx.applyDirectReplaceRule(rule, nextIndex, nextInMatch)
		}
	}
}

// prevKramaMatchesInput reports whether `prev` (krama indexes) is what was read before the end of
// the match.
//
// The letters read, not the input characters: the end of `prev` is compared with the krama of
// this match (a Tamil-Extended ்ரு² (ृ) starts with the halant character but is no halant, a
// Sinhala ඟ is ङ्ग), the rest with the characters before the match
func (ctx *transliterateCtx) prevKramaMatchesInput(prev, matchKrama []int16, matchStart int) bool {
	matchedKramaIdx := len(matchKrama)
	inputIdx := matchStart
	for p := len(prev) - 1; p >= 0; p-- {
		expected := int(prev[p])
		for matchedKramaIdx > 0 && matchKrama[matchedKramaIdx-1] < 0 {
			matchedKramaIdx--
		}
		if matchedKramaIdx > 0 {
			matchedKramaIdx--
			if int(matchKrama[matchedKramaIdx]) != expected {
				return false
			}
			continue
		}
		inputIdx--
		r, ok := ctx.cursor.peekAt(inputIdx)
		if !ok || kramaIndexOfChar(ctx.fromData, r) != expected {
			return false
		}
	}
	return true
}

// applyPrevKramaRuleOnInput: `replace_prev_krama_keys` checked in the input, `prev` read before
// and a `following` read next
func (ctx *transliterateCtx) applyPrevKramaRuleOnInput(
	rule *scriptdata.Rule,
	matchStart, nextIndex int,
	matchKrama []int16,
	nextInMatch *int16,
) {
	if matchStart < 0 || nextIndex < 0 {
		return
	}
	if !ctx.prevKramaMatchesInput(rule.Prev, matchKrama, matchStart) {
		return
	}
	var nextKrama int16
	if nextInMatch != nil {
		nextKrama = *nextInMatch
	} else {
		nextR, ok := ctx.cursor.peekAt(nextIndex)
		if !ok {
			return
		}
		nextIdx := kramaIndexOfChar(ctx.fromData, nextR)
		if nextIdx < 0 {
			return
		}
		nextKrama = int16(nextIdx)
	}
	if containsI16(rule.Following, nextKrama) {
		ctx.result.rewriteTailPieces(len(rule.Prev), replaceWithPieces(rule.ReplaceWith, ctx.toData))
	}
}

// applyPrevKramaRuleOnOutput: `replace_prev_krama_keys` checked in the output, the last piece is
// a `following` and `prev` is before it
func (ctx *transliterateCtx) applyPrevKramaRuleOnOutput(rule *scriptdata.Rule) {
	lp, ok := ctx.result.lastPiece()
	if !ok {
		return
	}
	followIdx := kramaIndexOfText(ctx.toData, lp)
	if followIdx < 0 || !containsI16(rule.Following, int16(followIdx)) {
		return
	}
	matched, mLen := matchPrevKramaSequence(ctx.result.peekAt, -2, rule.Prev, ctx.toData)
	if matched {
		pieces := replaceWithPieces(rule.ReplaceWith, ctx.toData)
		pieces = append(pieces, lp) // instead [...pieces, last_piece]
		ctx.result.rewriteTailPieces(mLen+1, pieces)
	}
}

// applyDirectReplaceRule: `direct_replace`, the end of the result is one of the `to_replace` groups
func (ctx *transliterateCtx) applyDirectReplaceRule(rule *scriptdata.Rule, nextIndex int, nextInMatch *int16) {
	lookup := ctx.fromData
	if ruleChecksOutput(rule) {
		lookup = ctx.toData
	}
	// a joiner is not added next to one already in the text (the Sinhala conjunct ZWJ
	// before a ZWJ, or before a ZWNJ asking for no conjunct)
	if nextInMatch == nil && rule.ReplaceText != nil && strings.HasSuffix(*rule.ReplaceText, zwj) && nextIndex >= 0 {
		if c, ok := ctx.cursor.peekAt(nextIndex); ok && (c == zwjRune || c == zwnjRune) {
			return
		}
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
		return
	}
}
