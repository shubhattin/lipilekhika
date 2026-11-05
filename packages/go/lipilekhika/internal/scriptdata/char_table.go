package scriptdata

import (
	"fmt"
	"slices"
	"unicode/utf8"
)

const (
	charTableBlockBits = 7
	charTableBlockSize = 1 << charTableBlockBits
	charTableBlockMask = charTableBlockSize - 1
)

// charTableBlock is the 128-slot table of one Unicode block (`r >> 7`).
// Slots store `index + 1`, so the zero value means "not present".
type charTableBlock struct {
	id    uint32
	table [charTableBlockSize]uint16
}

// CharIndexTable is a dense `rune -> index` lookup.
//
// Each script's single-character keys live in ASCII plus a handful of 128-codepoint
// Unicode blocks (its own block, shared Devanagari punctuation, Vedic marks, ...), so
// a direct-indexed table per block replaces string building + hashing with one or two
// array loads. Blocks are ordered by population so the script's primary block is probed first.
//
// Mirrors `CharIndexTable` in the rust package (`script_data/char_table.rs`).
// The zero value is an empty table.
type CharIndexTable struct {
	ascii  [charTableBlockSize]uint16
	blocks []charTableBlock
}

type charTableEntry struct {
	r     rune
	index int
}

// newCharIndexTable builds the table keeping the first index seen for each rune.
func newCharIndexTable(entries []charTableEntry) CharIndexTable {
	var t CharIndexTable
	counts := make([]int, 0)
	for _, e := range entries {
		if e.index < 0 || e.index >= 0xffff {
			panic(fmt.Sprintf("CharIndexTable index must fit in u16: %d", e.index))
		}
		var slot *uint16
		c := uint32(e.r)
		if c < charTableBlockSize {
			slot = &t.ascii[c]
		} else {
			id := c >> charTableBlockBits
			pos := slices.IndexFunc(t.blocks, func(b charTableBlock) bool { return b.id == id })
			if pos < 0 {
				t.blocks = append(t.blocks, charTableBlock{id: id})
				counts = append(counts, 0)
				pos = len(t.blocks) - 1
			}
			counts[pos]++
			slot = &t.blocks[pos].table[c&charTableBlockMask]
		}
		if *slot == 0 {
			*slot = uint16(e.index + 1)
		}
	}

	// most populated block first (stable, so equal counts keep insertion order)
	order := make([]int, len(t.blocks))
	for i := range order {
		order[i] = i
	}
	slices.SortStableFunc(order, func(a, b int) int { return counts[b] - counts[a] })
	sorted := make([]charTableBlock, len(t.blocks))
	for i, o := range order {
		sorted[i] = t.blocks[o]
	}
	t.blocks = sorted
	return t
}

// newCharIndexTableFromKeys builds the table from the single-rune keys among
// `key(0..n)` (index = position); multi-rune keys are skipped.
func newCharIndexTableFromKeys(n int, key func(i int) string) CharIndexTable {
	entries := make([]charTableEntry, 0, n)
	for i := 0; i < n; i++ {
		if r, ok := singleRune(key(i)); ok {
			entries = append(entries, charTableEntry{r: r, index: i})
		}
	}
	return newCharIndexTable(entries)
}

// Get returns the index stored for `r`, or -1 if not present.
func (t *CharIndexTable) Get(r rune) int {
	c := uint32(r)
	var v uint16
	if c < charTableBlockSize {
		v = t.ascii[c]
	} else {
		id := c >> charTableBlockBits
		for i := range t.blocks {
			if t.blocks[i].id == id {
				v = t.blocks[i].table[c&charTableBlockMask]
				break
			}
		}
	}
	return int(v) - 1
}

// singleRune returns the rune if `text` is exactly one (valid) rune.
func singleRune(text string) (rune, bool) {
	if text == "" {
		return 0, false
	}
	r, size := utf8.DecodeRuneInString(text)
	if r == utf8.RuneError || size != len(text) {
		return 0, false
	}
	return r, true
}
