package lipilekhika

import "unicode/utf16"

// UTF-16 helpers to match JS string indexing semantics.

func utf16EncodeString(s string) []uint16 {
	// Input strings are valid Unicode, so encoding is straightforward.
	r := []rune(s)
	return utf16.Encode(r)
}

func decodeUTF16UnitsPreserveSurrogates(units []uint16) string {
	// Like JS substring: preserves lone surrogate code units.
	out := make([]rune, 0, len(units))
	for i := 0; i < len(units); {
		u := units[i]
		if u >= 0xD800 && u <= 0xDBFF && i+1 < len(units) { // high surrogate
			lo := units[i+1]
			if lo >= 0xDC00 && lo <= 0xDFFF {
				cp := 0x10000 + ((int(u) - 0xD800) << 10) + (int(lo) - 0xDC00)
				out = append(out, rune(cp))
				i += 2
				continue
			}
		}
		out = append(out, rune(u))
		i++
	}
	return string(out)
}

func utf16CodePointAt(units []uint16, idx int) (cp int, width int, ok bool) {
	if idx < 0 || idx >= len(units) {
		return 0, 0, false
	}
	u := units[idx]
	// surrogate pair
	if u >= 0xD800 && u <= 0xDBFF && idx+1 < len(units) {
		lo := units[idx+1]
		if lo >= 0xDC00 && lo <= 0xDFFF {
			cp = 0x10000 + ((int(u) - 0xD800) << 10) + (int(lo) - 0xDC00)
			return cp, 2, true
		}
	}
	return int(u), 1, true
}

func utf16LastCodePointString(s string) string {
	u := utf16EncodeString(s)
	if len(u) == 0 {
		return ""
	}
	// If ends with low surrogate and has a preceding high surrogate, return pair.
	last := u[len(u)-1]
	if last >= 0xDC00 && last <= 0xDFFF && len(u) >= 2 {
		prev := u[len(u)-2]
		if prev >= 0xD800 && prev <= 0xDBFF {
			return decodeUTF16UnitsPreserveSurrogates(u[len(u)-2:])
		}
	}
	return decodeUTF16UnitsPreserveSurrogates(u[len(u)-1:])
}

func utf16SliceByUnits(s string, from, to int) string {
	u := utf16EncodeString(s)
	if from < 0 {
		from = 0
	}
	if to < 0 {
		to = 0
	}
	if from > len(u) {
		from = len(u)
	}
	if to > len(u) {
		to = len(u)
	}
	if to < from {
		to = from
	}
	return decodeUTF16UnitsPreserveSurrogates(u[from:to])
}

type cursorCp struct {
	Cp    int
	Ch    string
	Width int // in UTF-16 code units
}

type inputCursor struct {
	units []uint16
	pos   int // UTF-16 code unit index
}

func makeInputCursor(text string) *inputCursor {
	return &inputCursor{units: utf16EncodeString(text), pos: 0}
}

func (c *inputCursor) PeekAt(index int) *cursorCp {
	cp, width, ok := utf16CodePointAt(c.units, index)
	if !ok {
		return nil
	}
	ch := decodeUTF16UnitsPreserveSurrogates(c.units[index : index+width])
	return &cursorCp{Cp: cp, Ch: ch, Width: width}
}

func (c *inputCursor) Peek() *cursorCp {
	return c.PeekAt(c.pos)
}

func (c *inputCursor) Advance(units int) {
	c.pos += units
	if c.pos < 0 {
		c.pos = 0
	}
	if c.pos > len(c.units) {
		c.pos = len(c.units)
	}
}

func (c *inputCursor) Slice(from, to int) string {
	if from < 0 {
		from = 0
	}
	if to < 0 {
		to = 0
	}
	if from > len(c.units) {
		from = len(c.units)
	}
	if to > len(c.units) {
		to = len(c.units)
	}
	if to < from {
		to = from
	}
	return decodeUTF16UnitsPreserveSurrogates(c.units[from:to])
}

func (c *inputCursor) LenUnits() int {
	return len(c.units)
}
