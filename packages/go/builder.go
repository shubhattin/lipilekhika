package lipilekhika

import "strings"

type stringBuilder struct {
	pieces []string
}

func newStringBuilder() *stringBuilder {
	return &stringBuilder{pieces: []string{}}
}

func (b *stringBuilder) Emit(text string) {
	if text == "" {
		return
	}
	b.pieces = append(b.pieces, text)
}

func (b *stringBuilder) EmitPieces(p []string) {
	for _, s := range p {
		b.Emit(s)
	}
}

func (b *stringBuilder) LastPiece() string {
	if len(b.pieces) == 0 {
		return ""
	}
	return b.pieces[len(b.pieces)-1]
}

// LastChar mirrors JS `.at(-1)` (code point), not last UTF-16 code unit.
func (b *stringBuilder) LastChar() string {
	lp := b.LastPiece()
	if lp == "" {
		return ""
	}
	return utf16LastCodePointString(lp)
}

// PopLastChar mirrors the JS behavior:
// - returns last code point (String.prototype.at(-1))
// - but removes ONE UTF-16 code unit (slice(0,-1))
func (b *stringBuilder) PopLastChar() string {
	if len(b.pieces) == 0 {
		return ""
	}
	lp := b.pieces[len(b.pieces)-1]
	if lp == "" {
		b.pieces = b.pieces[:len(b.pieces)-1]
		return ""
	}
	ch := utf16LastCodePointString(lp)
	rest := utf16SliceByUnits(lp, 0, len(utf16EncodeString(lp))-1)
	if rest != "" {
		b.pieces[len(b.pieces)-1] = rest
	} else {
		b.pieces = b.pieces[:len(b.pieces)-1]
	}
	return ch
}

func (b *stringBuilder) RewriteTailPieces(count int, newPieces []string) {
	if count <= 0 {
		return
	}
	if count > len(b.pieces) {
		count = len(b.pieces)
	}
	trim := b.pieces[:len(b.pieces)-count]
	filtered := make([]string, 0, len(newPieces))
	for _, p := range newPieces {
		if p != "" {
			filtered = append(filtered, p)
		}
	}
	b.pieces = append(trim, filtered...)
}

func (b *stringBuilder) WithLastCharMovedAfter(beforePieces []string, afterPieces []string) {
	ch := b.PopLastChar()
	if ch == "" {
		b.EmitPieces(beforePieces)
		b.EmitPieces(afterPieces)
		return
	}
	b.EmitPieces(beforePieces)
	b.Emit(ch)
	b.EmitPieces(afterPieces)
}

func (b *stringBuilder) String() string {
	var sb strings.Builder
	for _, p := range b.pieces {
		sb.WriteString(p)
	}
	return sb.String()
}
