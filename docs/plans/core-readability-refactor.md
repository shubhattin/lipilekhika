# Plan: make the transliteration core easier to read (JS, Rust, Go)

Status: the core is implemented (see the outcome note). Written against `main` at `9d83bb8`. All line numbers
below are from that commit, find the code by the quoted names if the lines have moved.

> **Outcome (the core, sections 4 to 8, is done).** What differs from the plan below:
>
> - **Step 1 does not write the context.** The Tamil-Extended superscript it reads is returned
>   (Rust `TextMatch`, Go three results, JS the `matched_superscript_*` result fields) and only
>   the main loop sets `ta_ext_skip_index`. There is no `ta_ext_superscript_detached` field.
> - **Speed needed more than the split.** As separate calls the steps were 4 to 13% slower in
>   Rust and 6% in Go (the fields of the context are reloaded after every call, and the typing
>   copy of the core was not specialised). Rust: the per character steps are
>   `#[inline(always)]`, the rare cases `#[inline(never)]` (see the module comment of
>   `transliterate.rs`). Go: the hot predicates are split to fit the inliner. Result vs `main`:
>   Rust -7% / -8% / -1% / -4%, Go 0% / -7% / -15% / -21%, JS (built package) not slower.
> - **The JS benchmarks run the built package** (`packages/js/scripts/*.mjs`), not vite-node,
>   which measured the split itself (section 3.3 names the old commands).
> - Section 9 (typing data map, DOM handlers, script data generator) is not started.

This document is written to be handed to an implementing agent. Read all of it before starting.
Read [CONTRIBUTING.md](../../CONTRIBUTING.md) and [AGENTS.md](../../AGENTS.md) first.

## 1. Goal

The three implementations of the transliterator mirror each other:

| | Core file | Helpers |
| --- | --- | --- |
| JS | `packages/js/src/transliteration/transliterate.ts` (1340 lines) | `helpers.ts` (423) |
| Rust | `packages/rust/src/transliterate/transliterate.rs` (1900 lines) | `helpers.rs` (734) |
| Go | `packages/go/lipilekhika/internal/transliterate/transliterate.go` (1393 lines) | `helpers.go` (455) |

The data structures and small helpers are fine. The problem is three functions, the same three in
every language, which hold almost all of the logic:

| Function | JS (oxlint cyclomatic) | Rust (clippy cognitive, lines) | Go (gocyclo / gocognit) |
| --- | --- | --- | --- |
| `transliterate_text_core` (the main loop) | **265**, 611 lines, 8 nested blocks | **121**, 805 lines | **245 / 535** |
| `prev_context_cleanup` | 64, 6 positional parameters | 20, 174 lines | 52 / 46 |
| `apply_custom_trans_rules` | 38 | 23, 142 lines | 40 / 103 |

The main loop mixes, in one body: the per call setup, four kinds of pass-through characters, the
longest match scan (with vowel retraction, two Tamil-Extended special cases and the NFD case inside
it), two post filters, three ways to update the context, three ways to emit, and the single
character fallback. A reader has to hold about ten mutable locals in the head.

**What we want**: the main loop reads as a short list of named steps, every step is a function
that fits on a screen, the same names and the same file layout exist in JS, Rust and Go, and the
output and the speed do not change.

### Decisions already taken (by the maintainer)

1. **Scope**: the core first (sections 4 to 8), in full detail. The typing data map and the script
   data generator are a later, smaller phase (section 9).
2. **Layout**: split into modules, the same in the three languages (section 5).
3. **Speed**: no measurable regression. Benchmarks must stay within noise (about 2%) of `main`
   after every step. An extraction that costs more is done differently or left inline with a
   comment saying why.
4. **Guardrails**: report only. Complexity numbers are measured before and after and written in
   the PR. No CI gate.

### Non-goals

- **No behaviour change.** Same output and same `context_length` for every input. This is a pure
  refactor. Differences between the languages that are found on the way are written down
  (section 10), not fixed here.
- No change of the public API of any package (JS exports, Rust `pub` items of the crate, Go
  exported names of `lipilekhika` and `lipilekhika/typing`).
- No change of the script data format, the generated files or the test data.
- No renaming of existing helpers for style (JS `helpers.ts` is camelCase and `transliterate.ts`
  is snake_case, leave both as they are). New functions use snake_case in JS and Rust, camelCase
  in Go, with the same words.
- No new algorithm, no new optimisation. If you see one, note it in the PR, do not do it.

## 2. Rules for the implementing agent

1. **Move code, do not rewrite it.** Cut the block, paste it in the new function, replace the
   locals it used with parameters or `ctx` fields. Keep every condition in the same order (the
   order is the short-circuit order and was tuned). Keep every comment, with its examples
   (`க்²ரு॑²`, `kaī`, `logoṃ` ...), next to the code it explains. These comments are the only
   documentation of why a branch exists.
2. **One step at a time, one commit per step per language.** After each step: format, run the
   tests, run the differential check (section 3.2). Run the benchmarks at the points given in
   section 3.3.
3. **Same names in the three languages.** When a function is added in one language, it is added
   with the same name (in that language's case style) in the other two, even when one language
   needs it less. Go already has some of them (`emitHalant`, `kramaListItem`, `anyKramaKind`,
   `resultLastCharIsTaExtSuperscript`): use the Go names as the base.
4. **If a step cannot be done without changing behaviour or losing speed, stop that step**, keep
   the code inline, add a short comment, and write it in the PR. Do not force it.
5. **Do not "fix" what looks wrong.** Section 10 lists the known differences between the
   languages. Each language keeps its present behaviour.
6. Follow the repo workflow: work on a branch, format before each commit (`bun run format` in
   `packages/js`, `cargo fmt --all`, `gofmt -w .` in `packages/go/lipilekhika`), squash merge.
   Suggested structure: one umbrella branch `refactor/core-readability` with a PR into `main`,
   and one sub PR into it per phase of section 11. The maintainer merges the umbrella PR.

### Speed rules (these decide how the functions are cut)

The hot path is: one loop iteration per input character, most iterations take the single
character lookup, emit one piece and update the context. Keep it allocation free.

**JS**

- No object, array or closure is created per loop iteration on the common path. Today the only
  allocations are in rare paths (Tamil-Extended, custom rules). Keep it so.
- A function that has two results returns the main one (a number or a boolean) and writes the
  other into a `ctx` field. Never return `{a, b}` or `[a, b]` from a per character function.
- `ctx` is created once with **all** its fields in one object literal, the mutable ones included
  (`ta_ext_skip_index: -1`, `ta_ext_superscript_detached: false`). Never add a field later (it
  changes the hidden class).
- New functions are module level `function` declarations taking `ctx` first. No closure defined
  inside the loop (today `isMatraCp` and `list_ref_of` are created inside the loop, they become
  module level functions).
- Keep the code point lookups (`textToKramaMapCharIndex`, `kramaIndexOfChar`, `cursor.cpAt`) and
  the lazy building of strings (`char_to_search` is only built when needed) exactly as they are.
- `tsconfig.json` has `verbatimModuleSyntax`, so no `const enum`. Use plain module constants
  (`export const MODE_NONE = 0`).

**Rust**

- New functions are methods of `TransliterateCtx` or of `ScriptData`, or free functions. Mark the
  small ones `#[inline]`. Use `#[inline(always)]` only when a benchmark shows it is needed, and
  say so in a comment.
- Keep the two generics that make the fast path monomorphic: `R: Borrow<Rule>` and
  `impl CoreBuffers`.
- Borrowing: `ctx` holds `&'a mut` to the cursor, the result and the context. Before calling a
  `&mut self` method, copy the shared references out of `self` (`let to = self.to_script_data;`
  `let map = self.text_to_krama_map;`). A `&'a str` taken from `cursor.slice(..)` or from the
  script data lives for `'a`, not for the borrow of `self`, so it can be kept across calls. Do not
  add `.clone()` or `.to_owned()` to make the borrow checker happy: find the copy-the-reference
  form.
- No new `String` / `Vec` on the common path. The stack buffer `pieces_buf` and the
  `encode_utf8(&mut [0u8; 4])` tricks stay.

**Go**

- New functions are methods of `*transliterateCtx` or package functions. The Go inliner only
  inlines small leaf functions, so a call per character has a real (small) cost: the benchmark
  decides. Check with `go build -gcflags=-m ./internal/transliterate 2>&1 | grep -E 'inline|escape'`
  that `ctx`, `cursor`, `result` and `prevCtx` still do not escape to the heap.
- No closure that captures loop variables on the common path (`isHalant` / `isMatra` in the
  Tamil-Extended block become methods).
- Return `int` / `bool`, not structs, from per character functions.

## 3. Phase 0: safety net (do this before touching the core)

### 3.1 Tests that exist

```sh
# once, from the repo root and packages/js
bun install && bun run gen:test-data
cd packages/js && bun install && bun run make-script-data && ./get_bindings.sh

# JS (packages/js)
bun run check && bun run test:run && bun lint

# Rust (packages/rust)
cargo test --release && cargo test --release --features std typing::
cargo clippy -p lipilekhika --all-targets

# Go (packages/go/lipilekhika)
go vet ./... && go test ./...
```

The JS tests also run the WASM and N-API builds of the Rust crate: after Rust changes run
`./get_bindings.sh` again in `packages/js`, and `uvx maturin develop --release` + `uv run pytest`
in `packages/python`.

### 3.2 Differential check (new, temporary, not committed)

The YAML test data is large but it does not reach every branch of a function of complexity 265.
A pure refactor is best checked by comparing old and new on a lot of generated input. Build this
once, keep it outside the repo (eg. `/tmp/lipi-diff/`) or uncommitted:

1. **Corpus generator** (one Bun script, fixed seed). It reads the generated JS script data and
   writes `corpus.jsonl`, one case per line: `{ "text", "from", "to", "options", "typing" }`.
   - For every ordered pair of scripts: about 200 random texts of 1 to 12 tokens. The tokens of a
     script are: every text of `krama_text_arr`, every key of `text_to_krama_map`, every text of
     `custom_script_chars_arr`, plus the special characters that have their own branches: space,
     `,`, `~`, `!`, digits `0`-`9`, native digits, ZWJ `U+200D`, ZWNJ `U+200C`, the Latin
     combining marks `U+0304 U+0323 U+0301 U+0303`, the Tamil-Extended superscripts `² ³ ⁴`, the
     Vedic svaras `॒ ॑ ᳚ ᳛`, the halant and the nuqta of the script, an unknown character (`€`),
     a non-BMP character (a Brahmi letter).
   - Option sets per pair: none, each option of `getAllOptions(from, to)` alone, all of them.
   - Typing cases (`"typing": true`): `from` is `Normal`, the text is a random ASCII key sequence
     (letters, `.`, `'`, `_`, `^`, `q`, `x`, digits, space), for every target script, with
     `useNativeNumerals` and `includeInherentVowel` both ways.
   - Aim for 150k to 300k cases. It must be deterministic (same seed, same file).
2. **A dump program per language** (20 to 40 lines each). It reads `corpus.jsonl` and writes one
   line per case: the output, and for typing cases the output of `emulate_typing` /
   `EmulateTyping` and the `context_length` of each key. JS calls the JS implementation
   (`transliterate` from `src/index_main.ts`, and the typing context), Rust and Go their own.
3. **Golden files**: run the three dump programs on `main` (`git worktree add /tmp/lipi-main main`)
   and keep `golden.js.txt`, `golden.rust.txt`, `golden.go.txt`.
4. **After every step**: run the dump of the language you changed and `cmp` with its golden file.
   Any difference is a bug in the step: fix the step, never the golden file.

Note: the three golden files may differ from each other (section 10). That is expected. Compare a
language only with itself.

### 3.3 Benchmark baseline

Run on a quiet machine, on `main`, and keep the results:

```sh
# Rust (packages/rust)
cargo bench -- --save-baseline main
# later, on the branch:
cargo bench -- --baseline main

# Go (packages/go/lipilekhika)
go test -run '^$' -bench . -benchmem -count 10 > /tmp/lipi-diff/go.main.txt
# later:
go test -run '^$' -bench . -benchmem -count 10 > /tmp/lipi-diff/go.new.txt
go run golang.org/x/perf/cmd/benchstat@latest /tmp/lipi-diff/go.main.txt /tmp/lipi-diff/go.new.txt

# JS (packages/js), Node and Bun
bun run bench:suite -- --json /tmp/lipi-diff/js.main.json
bun run bench:suite:bun -- --json /tmp/lipi-diff/js.bun.main.json
```

Run the statistical suites after steps S2, S3, S6 and S7 of section 6 (the ones that touch the
per character path) and at the end of each language. Rule: a result more than about 2% slower
that repeats on a second run is a regression, the step is reworked. Also check `allocs/op` in Go
(must not go up) and the allocation column of mitata. Report the numbers in the PR.

### 3.4 Complexity report (report only)

These three commands work today. Run them before and after, put the two tables in the PR.

```sh
# JS (packages/js). Config in a temp file, not in the repo's .oxlintrc.json
cat > /tmp/lipi-diff/oxlint.complexity.json <<'EOF'
{
  "plugins": ["typescript"],
  "categories": {},
  "rules": {
    "eslint/complexity": ["warn", { "max": 15 }],
    "eslint/max-depth": ["warn", { "max": 4 }],
    "eslint/max-lines-per-function": ["warn", { "max": 120, "skipBlankLines": true, "skipComments": true }],
    "eslint/max-params": ["warn", { "max": 5 }]
  }
}
EOF
bunx oxlint -c /tmp/lipi-diff/oxlint.complexity.json src/transliteration src/typing.ts

# Rust (packages/rust)
mkdir -p /tmp/lipi-diff/clippy
printf 'cognitive-complexity-threshold = 15\ntoo-many-lines-threshold = 120\n' > /tmp/lipi-diff/clippy/clippy.toml
CLIPPY_CONF_DIR=/tmp/lipi-diff/clippy cargo clippy -p lipilekhika --lib -- \
  -A clippy::all -W clippy::cognitive_complexity -W clippy::too_many_lines

# Go (packages/go/lipilekhika)
go run github.com/fzipp/gocyclo/cmd/gocyclo@latest -over 15 ./internal/transliterate ./typing
go run github.com/uudashr/gocognit/cmd/gocognit@latest -over 15 ./internal/transliterate ./typing
```

Optional at the end: put the three commands in one script `scripts/tools/complexity-report.sh`
and mention it in CONTRIBUTING.md. It only prints, it never fails.

**Targets** (not gates): main loop body under 40 lines; no function of the core over about 20
(oxlint / gocyclo) except where noted in section 7; no block nested deeper than 4; no function
with more than 5 parameters except the two public `transliterate_text_core*` entry points (their
signature is used by the typing module and stays).

## 4. The design: four ideas that remove most of the nesting

These four are done first because every later extraction uses them.

### 4.1 `ContextMode`: one value in place of the repeated direction tests

The test "from is brahmic and to is other" (and its mirror) is written out about 12 times per
language, and `PREV_CONTEXT_IN_USE` is tested about 10 times, often as the outer `if` of a three
way chain. All of it is one value computed once:

| Mode | Condition (as computed today) |
| --- | --- |
| `BrahmicToOther` | from `brahmic` and to `other` |
| `OtherToBrahmic` | from `other` and to `brahmic` |
| `TypingToOther` | `typing_mode` and from is `Normal` and to `other` |
| `None` | everything else (brahmic to brahmic, other to other without typing) |

The first three rows cannot be true together (`Normal` is `other`), so the order of the tests does
not matter. Then:

- `PREV_CONTEXT_IN_USE` is exactly `mode != None`. Keep a field `prev_context_in_use` if it reads
  better, but compute it from the mode.
- `BRAHMIC_HALANT` / `BRAHMIC_NUQTA`: from the `from` data in `BrahmicToOther`, from the `to` data
  in `OtherToBrahmic`, else none.
- `check_vowel_retraction` starts with `mode == OtherToBrahmic`.
- The ZWJ / ZWNJ skip in Step 2 is `mode == BrahmicToOther`.
- The chain in Step 1 (JS 1057-1149) `if in_use { if b→o … else if o→b … else if typing && Normal
  && to other … }` becomes a `switch` / `match` on the mode.
- The chain in Step 2 (JS 1248-1268) is `if from brahmic … else if to brahmic … else if typing &&
  Normal`. Inside `in_use` these three are again the three modes (in use and from brahmic means
  to is other; in use and neither side brahmic can only be typing to other). So it is the same
  `switch`.
- Rust and Go result capacity (`× 3`) is `mode == OtherToBrahmic`.
- `prev_context_cleanup` tests the two script types itself. It is also called when the context is
  not in use (the digit branch, the custom character branch and the `-1` krama branch in typing
  mode call it without the `in_use` test). With mode `None` or `TypingToOther` neither of its two
  direction blocks runs, as today. So inside it: `BrahmicToOther` → first block,
  `OtherToBrahmic` → second block, else nothing.

Tests that are **not** the mode and stay as they are: `from is other` alone (the NFD case),
`from other && to other` (`om_only_at_word_start`), `to is brahmic` in the Tamil-Extended output
reorder (in Rust it is needed to get `halant` out of the enum).

```ts
// JS (context.ts)
export const MODE_NONE = 0;
export const MODE_BRAHMIC_TO_OTHER = 1;
export const MODE_OTHER_TO_BRAHMIC = 2;
export const MODE_TYPING_TO_OTHER = 3;
export type ContextMode = 0 | 1 | 2 | 3;
```

```rust
// Rust (context.rs)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum ContextMode { None, BrahmicToOther, OtherToBrahmic, TypingToOther }
```

```go
// Go (context.go)
type contextMode uint8
const (
	modeNone contextMode = iota
	modeBrahmicToOther
	modeOtherToBrahmic
	modeTypingToOther
)
```

### 4.2 All per call state in `TransliterateCtx`

Today about 15 values computed before the loop are locals of the big function, which is why
nothing can be moved out of it. Put them in the context struct (it exists in the three
languages). After this, any block of the loop can become a function of `ctx`.

Fields (JS names, the others follow). New ones are marked `+`:

| Field | Was |
| --- | --- |
| `from_script_name`, `to_script_name`, `from_script_data`, `to_script_data` | same |
| `trans_options`, `custom_rules` | same |
| `cursor`, `result`, `prev_context` | same |
| `+ mode` | `PREV_CONTEXT_IN_USE` and the direction tests |
| `BRAHMIC_NUQTA`, `BRAHMIC_HALANT` | same |
| `typing_mode`, `include_inherent_vowel` | same |
| `+ use_native_numerals` | local |
| `is_from_tamil_ext`, `is_to_tamil_ext` | same |
| `+ use_typing_chars` | local (`typing_mode` or the `normal_to_all:use_typing_chars` option) |
| `+ use_typing_map` | local `use_typing_text_to_krama_map` |
| `+ lookup_data` | local `text_to_krama_lookup_script_data` |
| `+ text_to_krama_map` | local (the map whose indexes the lookups return) |
| `+ text_to_krama_next_cps` | local (JS only, Rust and Go read `next_chars` of the entry) |
| `+ from_is_other` | `from_script_data.script_type === 'other'` (NFD case) |
| `+ tilde_is_text` | local |
| `+ om_only_at_word_start` | local |
| `+ preserve_specific_chars` | local `opt_preserve_specific_chars` |
| `+ has_in_match_rules` | local |
| `+ sinhala_conjunct_halant` | `to_script_name === 'Sinhala' && options['all_to_sinhala:use_conjunct_enabling_halant']` (Go has `sinhalaConjunct` and tests the name separately: fold the name test in) |
| `+ ta_ext_skip_index` (mutable) | local `ignore_ta_ext_sup_num_text_index` |
| `+ ta_ext_superscript_detached` (mutable) | local, set by the matcher, read once after it |

The setup code (JS 568-679, Rust 923-1046, Go 663-775) moves into one constructor
`create_transliterate_ctx(...)` / `TransliterateCtx::new(...)` / `newTransliterateCtx(...)` in the
context file. The two text preparations before it (`applyTypingInputAliases`, then
`apply_custom_replace_rules(..., 'input')`) stay in `transliterate_text_core`, as two lines, and
the prepared text is passed to the constructor.

Rust note: the cursor, the result builder and the context builder are created in
`transliterate_text_core_with` and borrowed by `ctx` as today (`&'a mut`). Only the plain values
and shared references are new fields. `opts` (a `Copy` struct) can be stored as it is.

Go note: `prevContextInUse`, `fromBrahmic`, `toBrahmic`, `fromOther`, `toOther`,
`omOnlyAtWordStart`, `useTypingMap`, `lookupData`, `textToKramaMap`, `tildeIsText`,
`hasInMatchRules`, `optPreserveSpecificChars`, `transOptUseTypingChars`, `ignoreTaExtSupIndex`
are the locals to move. Go already has `hasNuqta` because its strings are not nullable, keep it.

### 4.3 Small predicates that are written out again and again

Add these to the helpers (same names in the three languages). Each replaces a repeated
expression, with no change of meaning.

| New helper | Replaces | Times (JS) |
| --- | --- | --- |
| `listItemOfKrama(data, krama_index)` → list item or none | `data.list[data.krama_text_arr[k]?.[1] ?? -1]` (Rust: the `.krama_text_arr.get(i).and_then(\|(_, li)\| *li).and_then(\|li\| list.get(li as usize))` chain). Go has it: `kramaListItem` | about 11 |
| `prev_ends_with_vyanjana(ctx)` | `prev.typeAt(-1) === 'vyanjana' \|\| (NUQTA && prev.typeAt(-2) === 'vyanjana' && prev.textAt(-1) === NUQTA)` | 3 (cleanup b→o, cleanup include inherent vowel, vowel retraction) |
| `result_ends_with_ta_ext_superscript(ctx)` | `is_to_tamil_ext && isTaExtSuperscriptTail(result.lastChar())`. Go has the second half as `resultLastCharIsTaExtSuperscript` | 6 |
| `is_fully_read_krama(krama)` | `krama && krama.length > 0 && !krama.includes(-1)` | 3 (NFD head, ॐ part, generator-like checks) |
| `context_text_of_match(data, krama, matched_text, halant)` | `krama.length === 1 && kramaTextOrEmpty(data, krama[0]) === HALANT ? HALANT : matched_text` | 2 |
| `emit_halant(ctx)` | the block "emit the halant with reorder, then add the Sinhala ZWJ" that is copied twice in `prev_context_cleanup` (JS 249-259 and 269-279, Rust 286-314 and 328-352). Go has it | 2 |
| `has_krama_other_than(krama, -1)` | exists in JS and Go (`hasKramaOtherThanNeg1`), in Rust it is an inline `iter().any(..)` three times: add `krama_has_output(krama)` there | - |

Details that must be kept:

- `prev_ends_with_vyanjana`: Rust writes `self.brahmic_halant.is_some()` in the first of the three
  places (line 232) where JS and Go test the nuqta. The result is the same (`text_at(-1)` is never
  `None` when there are two items), so the shared helper with the nuqta test is safe in Rust too.
  See section 10, item 2.
- `emit_halant` in JS: today the Tamil-Extended branch and the Sinhala branch are an `if / else`.
  Go does both in sequence. They are the same because the target cannot be both scripts. Use the
  Go form: reorder flag from `result_ends_with_ta_ext_superscript`, then the Sinhala ZWJ if
  `sinhala_conjunct_halant`.
- Move the character class helpers that are at the top of `transliterate.ts` / `.rs` into the
  helpers file, where Go already has them: `ZWJ`, `ZWNJ`, `isLatinCombiningMark`, `isWordCp`,
  `OM_KRAMA_INDEX`, `STANDARD_SCHEMES` / `is_standard_scheme`, `isSkipChar`.
- Rust: the doc comment "Emit the target-script text of each krama index directly…" sits on
  `with_tail` (lines 53-56), it belongs to `emit_krama_pieces`. Put it back when moving.

### 4.4 Explicit names for the two positions of a match

`apply_custom_trans_rules(text_index, delta, ...)` takes "the index after the match" and a
negative delta, and adds them to get the start. JS passes `(end, -len)`, Rust passes `(start, 0)`
in one call and `(pos, -len)` in the others. Change the signature to the two positions:

```
apply_custom_trans_rules(ctx, match_start, next_index, match_krama, next_in_match?)
```

- `match_start`: index of the first character of the match (was `text_index + delta`).
- `next_index`: index of the character after the match (was `text_index`). It is only read when
  `next_in_match` is none.

In the same way, inside the loop use `char_index` (start of the current character) and
`cursor.pos` (after the match) and drop the reassigned `text_index` local.

## 5. Target layout

Same files in the three languages. `transliterate.*` keeps the public entry points and the loop.

```
JS    packages/js/src/transliteration/        Rust  packages/rust/src/transliterate/
Go    packages/go/lipilekhika/internal/transliterate/

transliterate   entry points, input preparation, the main loop, the pass-through steps,
                emit_match and Step 2                                            (~350 lines)
context         ContextMode, TransliterateCtx and its constructor,
                prev_context_cleanup and its parts, flush_prev_context,
                emit_halant, prev_ends_with_vyanjana                             (~300 lines)
matcher         Step 1: match_text_to_krama, the scan loop, vowel retraction,
                the NFD split, the dead consonant sign filter, ॐ inside a word,
                sign_has_base, only_read_in_longer_text                          (~300 lines)
tamil_ext       everything Tamil-Extended: the two input cases of the scan,
                the unconsumed superscript length, the output reorder emit        (~250 lines)
custom_rules    apply_custom_trans_rules and its three parts,
                apply_custom_replace_rules, get_rule_replace_text                (~250 lines)
options         get_active_custom_options, resolve_transliteration_rules,
                the option types (Go: joins the existing options.go)             (~120 lines)
helpers         cursor, result builder, context builder, lookups, predicates,
                character classes, typing aliases (as today + section 4.3)
```

Import rules, so that nothing outside these folders changes:

- **JS**: about ten files import the types `CustomOptionType` / `CustomOptionList` from
  `./transliteration/transliterate`, `typing.ts` and `index_main.ts` import functions from it,
  and a test imports `get_active_custom_options` from it. Keep all of them working by
  re-exporting from `transliterate.ts`:
  `export { get_active_custom_options, resolve_transliteration_rules, type CustomOptionList, type CustomOptionType } from './options';`
  and the same for `apply_custom_replace_rules` if anything imports it. The module graph must have
  no cycle: `helpers` ← `options` ← `context` ← `custom_rules`, `tamil_ext` ← `matcher` ←
  `transliterate`. `TransliterateCtx` is a type, import it with `import type`.
- **Rust**: `mod.rs` declares the new modules. `typing.rs` imports
  `crate::transliterate::transliterate::{TransliterateScratch, TransliterationFnOptions, TransliterationOutput, resolve_transliteration_rules, transliterate_text_core_with}`
  and `script_data/mod.rs` uses `crate::transliterate::transliterate::get_active_custom_options`.
  Either keep these paths with `pub use super::options::{...};` in `transliterate.rs`, or update
  the two import sites. The module `transliterate` is private to the crate (`mod transliterate;`
  in `lib.rs`), so this is not a public API change. The struct fields of `TransliterateCtx`
  become `pub(super)`, and each file adds its own `impl<'a, R: Borrow<Rule>> TransliterateCtx<'a, R>`
  block.
- **Go**: one package, so moving functions between files changes no import.

## 6. Steps (the same list for each language)

Do the language completely (S1 to S8), then the next one. Suggested order: **JS, then Rust, then
Go**. JS is the reference the other two were ported from, and Go already has some of the helpers.
When a later language shows a better cut, go back and change the earlier one so the three stay
the same.

Every step ends with: format, tests, differential check. Benchmarks where marked ⏱.

| Step | What | Risk |
| --- | --- | --- |
| S1 | Predicates and helpers of section 4.3. Mechanical replace | low |
| S2 ⏱ | `ContextMode` and the wider `ctx` (4.1, 4.2). Setup moves to the constructor. The loop body does not move yet, it only reads `ctx.x` in place of the locals | medium |
| S3 ⏱ | Split `prev_context_cleanup` (7.1) | medium |
| S4 | Split `apply_custom_trans_rules`, new signature (7.2) | low |
| S5 | Main loop: the pass-through steps (7.3) | low |
| S6 ⏱ | Main loop: `emit_match` and Step 2 (7.4, 7.5) | medium |
| S7 ⏱ | Main loop: the matcher (7.6), the highest risk, done last when everything around it is already small | high |
| S8 | Move the functions into the files of section 5. No logic change in this commit | low |

## 7. The extractions in detail

Line numbers: `JS` = `transliterate.ts`, `RS` = `transliterate.rs`, `GO` = `transliterate.go`.
Code is shown in TypeScript. The Rust and Go forms are the same shape, with the notes given.

### 7.1 `prev_context_cleanup` (JS 167-308, RS 168-386, GO 284-402)

It does four separate things one after the other. Make each a function:

```ts
/** @returns `true` when the item was already written to the result here (do not emit it again) */
export function prev_context_cleanup(
  ctx: TransliterateCtx,
  item_text: string | undefined,
  item_list: ListItem | null | undefined,
  next: string[] | null | undefined = null,
  emits_ta_ext_superscript_tail = false
): boolean {
  const item_type = item_list?.type;
  if (item_type === 'anya') clear_context_after_matra(ctx);
  let joined = false;
  if (ctx.mode === MODE_BRAHMIC_TO_OTHER) emit_pending_schwa(ctx, item_text, item_type);
  else if (ctx.mode === MODE_OTHER_TO_BRAHMIC) joined = join_to_prev_vyanjana(ctx, item_text, item_list);
  update_prev_context(ctx, item_text, item_type, next, emits_ta_ext_superscript_tail);
  return joined;
}

/** After the last character: the inherent vowel / halant still owed to a trailing vyanjana */
export function flush_prev_context(ctx: TransliterateCtx) {
  if (ctx.mode === MODE_NONE) return;
  if (ctx.mode === MODE_BRAHMIC_TO_OTHER) emit_pending_schwa(ctx, undefined, undefined);
  else if (ctx.mode === MODE_OTHER_TO_BRAHMIC) join_to_prev_vyanjana(ctx, undefined, null);
}
```

| Part | Holds | JS | RS | GO |
| --- | --- | --- | --- | --- |
| `clear_context_after_matra(ctx)` | the "vyanjana (+ nuqta) + mAtrA, then anya: clear" test | 193-205 | 199-214 | 310-318 |
| `emit_pending_schwa(ctx, item_text, item_type)` | the brahmic → other block: emit `schwa_character` | 206-224 | 216-245 | 320-336 |
| `join_to_prev_vyanjana(ctx, item_text, item_list)` → bool | the other → brahmic block: linked mAtrA (returns `true`), or the halant | 225-281 | 246-354 | 337-367 |
| `update_prev_context(ctx, item_text, item_type, next, emits_tail)` | the typing mode clear, then the push | 282-305 | 356-383 | 369-389 |

Notes:

- `flush_prev_context` replaces the last call `prev_context_cleanup(ctx, undefined, null,
  undefined, true)` and removes the `last_extra_call` parameter from every other call (they all
  pass `false` / `None`). Why this is the same: with `last_extra_call` and no item, the typing
  clear is skipped (`!last_extra_call`) and nothing is pushed, so only the two emit blocks can do
  something. Check it with the differential run, typing cases included.
- **Rust and Go differ from JS in the first part on the last call** (section 10, item 1): they
  also clear the context when there is no item. Keep it: in Rust and Go `flush_prev_context`
  first calls `clear_context_after_matra` (and the normal path calls it for `anya`), in JS it does
  not. Add a one line comment in the three files pointing to the difference.
- `join_to_prev_vyanjana` after the extraction of `emit_halant`:

  ```ts
  const prev_is_vyanjana = ctx.prev_context.typeAt(-1) === 'vyanjana';
  if (prev_is_vyanjana && (item_type === 'mAtrA' || item_type === 'svara')) {
    // ... emit the linked mAtrA with emitPiecesWithReorder (as today)
    return true;
  }
  if (
    // default transliteration behavior (without schwa deletion)
    (!ctx.include_inherent_vowel && prev_is_vyanjana && item_type !== 'mAtrA' && item_text !== ctx.BRAHMIC_HALANT) ||
    // if to include inherent vowel then check when to add that skipped halant
    (ctx.include_inherent_vowel && item_type === 'vyanjana' && prev_ends_with_vyanjana(ctx))
  )
    emit_halant(ctx);
  return false;
  ```

  The first test uses only `typeAt(-1)`, the second uses the nuqta form. Keep that difference.
- JS destructures 12 fields of `ctx` at the top of the function on every call. After the split
  each part reads the two or three fields it needs.
- Rust: the public method keeps the `item: Option<PrevContextItem<'a>>` tuple. Drop the
  `last_extra_call: Option<bool>` parameter: `prev_context_cleanup(item, next)`,
  `prev_context_cleanup_ext(item, next, emits_ta_ext_superscript_tail)`, `flush_prev_context()`.
- Go: `prevContextCleanup(itemText, itemList, next)`, `prevContextCleanupExt(..., emitsTail)`,
  `flushPrevContext()`.

Expected: no part over about 12, max depth 2.

### 7.2 `apply_custom_trans_rules` (JS 317-412, RS 394-557, GO 410-521)

One function per kind of rule, and the loop only chooses:

```ts
export function apply_custom_trans_rules(
  ctx: TransliterateCtx,
  match_start: number,
  next_index: number,
  match_krama: readonly number[],
  next_in_match?: number
) {
  const rules = ctx.custom_rules;
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (rule.use_replace === true) continue;
    if (rule.type === 'direct_replace') apply_direct_replace_rule(ctx, rule, next_index, next_in_match);
    else if (rule.check_in === 'input')
      apply_prev_krama_rule_on_input(ctx, rule, match_start, next_index, match_krama, next_in_match);
    // the output side rule sees whole matches only, not the pieces of one
    else if (rule.check_in === 'output' && next_in_match === undefined)
      apply_prev_krama_rule_on_output(ctx, rule);
  }
}
```

| Part | JS | RS | GO |
| --- | --- | --- | --- |
| `apply_prev_krama_rule_on_input` | 338-369 | 434-476 | 430-474 |
| `prev_krama_matches_input(ctx, prev, match_krama, match_start)` → bool (the backward compare loop, used by the one above) | 343-358 | 442-455 | 438-454 |
| `apply_prev_krama_rule_on_output` | 370-388 | 477-503 | 475-490 |
| `apply_direct_replace_rule` | 390-409 | 505-554 | 492-518 |

Notes:

- The `if / else if` above is the JS meaning (a rule without `check_in` does nothing). Rust and Go
  treat "not output" as input and skip rules with a negative `prev` index. Keep each language as
  it is (section 10, items 3 and 4), only the shape is shared.
- Call sites: after a match `apply_custom_trans_rules(ctx, match_start, cursor.pos, krama)`,
  between the pieces of a match `(ctx, match_start, cursor.pos, krama_so_far, krama[i + 1])`.
  In both, `match_start` is `char_index` (the cursor was advanced by the match length from it).
- **Step 2 is different, keep its value exactly**: today it passes `(text_index, -char_width)` in
  JS and `(pos, -1)` in Rust and Go, so the start it gives is `cursor.pos - char_width` (JS) /
  `cursor.pos - 1` (Rust, Go). That is `char_index` for a single character, but **not** when
  Step 2 reads a matched text of several characters that has no krama of its own. Pass
  `cursor.pos - char_width` / `cursor.pos - 1` as `match_start` there, with a comment. Do not
  "correct" it to `char_index` (section 10, item 7).
- Keep the guard `custom_rules.length > 0` at the call sites, so the common path does not even
  make the call (and JS does not build `[index]`).
- Rust: `rule` is `&Rule` behind `R: Borrow<Rule>`. The parts take the fields they need after the
  `match rule { Rule::ReplacePrevKramaKeys { prev, following, replace_with, .. } => ... }`
  destructuring, so the outer function keeps the `match` and the parts take plain slices.

### 7.3 Main loop: the pass-through steps (JS 691-733, RS 1057-1109, GO 785-834)

Four early `continue` blocks become functions that return `true` when they consumed the
character:

```ts
/** The superscript of a Tamil-Extended match that was read with it (see `ta_ext_skip_index`) */
function skip_consumed_ta_ext_superscript(ctx, char_index, char_width): boolean   // JS 691-695

/** Characters that are copied as they are */
function emit_passthrough_char(ctx, cp, char_index, char_width): boolean {
  if (isSkipChar(cp) && !(cp === 0x7e && ctx.tilde_is_text)) {
    emit_skip_char(ctx, char_index, char_width);              // JS 697-706
    return true;
  }
  if (cp >= 0x30 && cp <= 0x39 && !ctx.use_native_numerals) {
    emit_ascii_digit(ctx, char_index, char_width);            // JS 708-716
    return true;
  }
  return ctx.preserve_specific_chars && emit_preserved_custom_char(ctx, char_index, char_width); // JS 720-733
}
```

Keep the cheap tests (`isSkipChar`, the digit range, the option flag) in the caller as shown, so
that for a normal letter the cost is three failed comparisons and no call to the three inner
functions.

### 7.4 Main loop: `emit_match` (JS 1012-1214, RS 1436-1733, GO 1060-1221)

What is done with a `text_to_krama_map` entry once it is chosen:

```ts
/** @returns `false` when the entry has no krama of its own: its text is read in Step 2 */
function emit_match(ctx: TransliterateCtx, match_index: number, match_start: number): boolean {
  const [matched_text, map] = ctx.text_to_krama_map[match_index];
  ctx.cursor.advance(matched_text.length - ta_ext_unconsumed_superscript_units(ctx, matched_text, map));
  if (ctx.use_typing_chars && 'custom_back_ref' in map && map.custom_back_ref != null) {
    emit_typing_custom_char(ctx, matched_text, map);
    return true;
  }
  const krama = map.krama;
  if (krama == null) return false;
  if (has_krama_other_than(krama, -1)) {
    emit_match_krama(ctx, matched_text, map, krama, match_start);
    return true;
  }
  if (krama.indexOf(-1) !== -1) {
    emit_prefix_only_match(ctx, matched_text, map);
    return true;
  }
  return false;
}
```

| Part | Holds | JS | RS | GO |
| --- | --- | --- | --- | --- |
| `ta_ext_unconsumed_superscript_units` (`tamil_ext`) → 0 or 1 | `index_delete_length` | 1018-1026 | 1446-1462 | 1071-1080 |
| `emit_typing_custom_char` | the `custom_back_ref` block | 1030-1051 | 1466-1486 | 1084-1097 |
| `emit_match_krama` | context update, emit, rules (below) | 1054-1194 | 1489-1705 | 1101-1204 |
| `emit_prefix_only_match` | the `-1` krama block | 1195-1210 | 1706-1728 | 1205-1218 |

```ts
function emit_match_krama(ctx, matched_text, map, krama, match_start) {
  const joined = update_context_for_match(ctx, matched_text, map, krama);
  if (!joined) {
    if (result_ends_with_ta_ext_superscript(ctx)) emit_krama_after_ta_ext_superscript(ctx, krama);
    else if (ctx.has_in_match_rules && krama.length > 1) emit_krama_with_in_match_rules(ctx, krama, match_start);
    else emit_krama_pieces(ctx.result, ctx.to_script_data, krama);
  }
  if (ctx.custom_rules.length > 0) apply_custom_trans_rules(ctx, match_start, ctx.cursor.pos, krama);
}

/** @returns `true` when the cleanup already wrote the item (the linked mAtrA) */
function update_context_for_match(ctx, matched_text, map, krama): boolean {
  switch (ctx.mode) {
    case MODE_BRAHMIC_TO_OTHER:
      return prev_context_cleanup(
        ctx,
        context_text_of_match(ctx.from_script_data, krama, matched_text, ctx.BRAHMIC_HALANT),
        source_list_item_of_match(ctx, map, krama)
      );
    case MODE_OTHER_TO_BRAHMIC:
      return update_context_for_brahmic_target(ctx, matched_text, map, krama);
    case MODE_TYPING_TO_OTHER:
      return prev_context_cleanup(ctx, matched_text, null, map.next);
    default:
      return false;
  }
}
```

| Part | Holds | JS | RS | GO |
| --- | --- | --- | --- | --- |
| `source_list_item_of_match(ctx, map, krama)` | which list item stands for a brahmic source match: `fallback_list_ref`, or for Tamil-Extended the mixture rule (vyanjana + mAtrA → `ANYA_LIST_ITEM`, a krama without list item → the last, else the first) | 1062-1099 | 1498-1542 | 1107-1121 |
| `update_context_for_brahmic_target` | the other → brahmic block: target list item, halant text, the typing mode call with `next` and `emits_ta_ext_superscript_tail` | 1112-1141 | 1562-1612 | 1131-1154 |
| `emit_krama_after_ta_ext_superscript` (`tamil_ext`) | the reorder of a mAtrA / halant / Vedic svara after a superscript | 1152-1170 | 1627-1672 | 1162-1180 |
| `emit_krama_with_in_match_rules` | emit piece by piece, rules between the pieces | 1171-1187 | 1673-1691 | 1181-1195 |

Notes:

- JS has `if (custom_options_json !== null)` around the custom character block (line 1038). It is
  always true (an imported JSON). Remove the test, keep the body.
- `source_list_item_of_match` in JS builds `list_refs = krama.map(list_ref_of)` and calls `.some`
  three times. It is the Tamil-Extended source only (rare), leave the allocation, but make
  `list_ref_of` the shared `listItemOfKrama`. Go has the better form (`anyKramaKind`): JS and Rust
  may take it if the differential check stays green, it is not required.
- Rust `emit_krama_after_ta_ext_superscript` keeps the stack buffer `pieces_buf: [&str; 8]`.

### 7.5 Main loop: Step 2 `emit_krama_char` (JS 1216-1292, RS 1735-1841, GO 1224-1287)

The single character (or matched text without krama) looked up in `krama_text_arr`:

```ts
function emit_krama_char(ctx, cp, char_index, char_width, match_index) {
  const item = match_index === -1 ? null : ctx.text_to_krama_map[match_index];
  const index = item === null ? kramaIndexOfChar(ctx.from_script_data, cp) : kramaIndexOfText(ctx.from_script_data, item[0]);
  // only built when needed (as today)
  const text = item !== null ? item[0]
    : index === -1 || ctx.mode !== MODE_NONE ? ctx.cursor.slice(char_index, char_index + char_width) : '';
  if (index === -1) return emit_unknown_char(ctx, text);                       // JS 1228-1246
  const joined = update_context_for_krama_char(ctx, text, index, item);        // JS 1247-1268
  if (!joined) {
    if (result_ends_with_ta_ext_superscript(ctx)) emit_krama_after_ta_ext_superscript(ctx, [index]);
    else ctx.result.emit(kramaTextOrEmpty(ctx.to_script_data, index));
  }
  // the start as it was passed before the refactor (`text_index - char_width`), see 7.2
  if (ctx.custom_rules.length > 0)
    apply_custom_trans_rules(ctx, ctx.cursor.pos - char_width, ctx.cursor.pos, [index]);
}
```

- The Tamil-Extended block of Step 2 (JS 1270-1290) is the one piece case of the Step 1 block
  (JS 1152-1170): same three branches (mAtrA or halant → reorder, Vedic svara → goes before the
  superscript, else plain emit). Use the one function for both. Check with the differential run
  on targets `Tamil-Extended`. If Rust cannot share it without an allocation, keep a
  `emit_piece_after_ta_ext_superscript(ctx, piece, krama_index)` for the one piece case and let
  the multi piece function call it when it has one piece.
- `update_context_for_krama_char` is the `switch` on the mode described in 4.1.
- The "advance one character when there was no match" (`cursor.advance(char_width)`) stays in the
  loop, before this call, so `cursor.pos` is already after the character here.

### 7.6 Main loop: the matcher, Step 1 (JS 735-1009, RS 1111-1435, GO 836-1056)

This is the deepest block (8 levels in JS). After the extraction:

```ts
/**
 * Step 1: the entry of `ctx.text_to_krama_map` to read at `char_index`, `-1` if none.
 * Can set `ctx.ta_ext_skip_index` and `ctx.ta_ext_superscript_detached`.
 */
export function match_text_to_krama(ctx, cp, char_index, char_width): number {
  ctx.ta_ext_superscript_detached = false;
  let index = scan_longest_match(ctx, cp, char_index, char_width);
  if (index === -1) return -1;
  if (is_dead_consonant_sign_without_base(ctx, index, char_index)) return -1;      // JS 975-983
  if (ctx.om_only_at_word_start) index = split_om_inside_word(ctx, index, char_index); // JS 984-1009
  return index;
}

function scan_longest_match(ctx, cp, text_index, char_width): number {
  const { cursor } = ctx;
  let scan_units = 0;
  let last_valid_vowel_match_index = -1;
  // (the "kAUM -> काऊं" comment)
  const check_vowel_retraction = ctx.mode === MODE_OTHER_TO_BRAHMIC && prev_ends_with_vyanjana(ctx);
  while (true) {
    if (ctx.ta_ext_skip_index !== -1 && isTaExtSuperscriptTailCp(cursor.cpAt(text_index + char_width + scan_units)))
      scan_units += 1;
    const end_index = text_index + char_width + scan_units;
    const single_char_lookup = scan_units === 0 && ctx.ta_ext_skip_index === -1;
    let char_to_search = '';
    let match_index: number;
    if (single_char_lookup) match_index = textToKramaMapCharIndex(ctx.lookup_data, cp, ctx.use_typing_map);
    else {
      char_to_search = scan_text(ctx, text_index, end_index);                  // JS 776-784
      match_index = textToKramaMapIndex(ctx.lookup_data, char_to_search, ctx.use_typing_map);
    }
    if (match_index === -1) return -1;

    if (check_vowel_retraction) {                                              // JS 799-824
      const kind = vowel_retraction_kind(ctx, match_index);   // SINGLE_VOWEL / OTHER / NO_KRAMA
      if (kind === SINGLE_VOWEL) last_valid_vowel_match_index = match_index;
      else if (kind === OTHER && last_valid_vowel_match_index !== -1) return last_valid_vowel_match_index;
    }

    const next_cps = ctx.text_to_krama_next_cps[match_index];
    if (next_cps !== null) {
      const nth_next_cp = cursor.cpAt(end_index);
      if (ctx.is_from_tamil_ext) {
        if (single_char_lookup) char_to_search = cursor.slice(text_index, end_index);
        let ta_ext = ta_ext_match_with_superscript(ctx, match_index, char_to_search, end_index);
        if (ta_ext === -1)
          ta_ext = ta_ext_split_before_halant_matra(ctx, char_to_search, end_index, nth_next_cp, next_cps);
        if (ta_ext !== -1) return ta_ext;
      }
      // Generic: if the next character is in the next list, extend scan and continue
      if (nth_next_cp !== -1 && next_cps.includes(nth_next_cp)) {
        scan_units += cpWidth(nth_next_cp);
        continue;
      }
    }
    if (scan_units > 0 && ctx.ta_ext_skip_index === -1 && ctx.from_is_other) {
      const head = nfd_split_before_marked_letter(ctx, match_index, text_index, end_index); // JS 935-970
      if (head !== -1) return head;
    }
    return match_index;
  }
}
```

| Part | File | Holds | JS | RS | GO |
| --- | --- | --- | --- | --- | --- |
| `scan_text` | matcher | the search text with the skipped superscript taken out | 776-784 | 1148-1170 | 865-872 |
| `vowel_retraction_kind` | matcher | "is this match one single svara / mAtrA of the target" | 799-814 | 1188-1201 | 882-887 |
| `ta_ext_match_with_superscript` | tamil_ext | `[halant \| mAtrA \| mAtrA mAtrA]? svara* superscript`: the match + the superscript found later. On success sets `ctx.ta_ext_skip_index` and `ctx.ta_ext_superscript_detached` | 840-881 | 1237-1281 | 912-950 |
| `ta_ext_split_before_halant_matra` | tamil_ext | the match ends with a halant that starts a mAtrA with a superscript: stop before the halant | 882-927 | 1282-1350 | 951-993 |
| `is_matra_char(data, cp)` | helpers | was the closure `isMatraCp` / `is_matra` | 836-839 | 1229-1236 | 908-911 |
| `nfd_split_before_marked_letter` | matcher | the decomposed letter case (`kaī`) | 935-970 | 1362-1392 | 1007-1022 |
| `is_dead_consonant_sign_without_base` | matcher | the Tamil anusvAra `ம்` filter (+ the existing `sign_has_base`) | 975-983 | 1400-1404 | 1030-1033 |
| `split_om_inside_word` | matcher | ॐ after a letter is read as the letters of its text | 984-1009 | 1408-1435 | 1037-1056 |

Notes, read them all before starting this step:

- **The original test is `is_from_tamil_ext && from is brahmic`.** Tamil-Extended is always
  brahmic, but in Rust the `if let ScriptData::Brahmic { halant, .. }` is how the halant is read:
  keep it inside the two Tamil-Extended functions.
- `ta_ext_match_with_superscript` has two results beside the index. Both go to `ctx`, and only
  when it succeeds. Keep the exact order of the three assignments:
  `detached = (skip_index === -1)` only when there is no sign, **then** `skip_index = sup_index`.
- The `-1` return of the two Tamil-Extended functions means "no special case, go on with the
  generic rule", not "no match".
- `vowel_retraction_kind`: the original only looks at entries with a non empty krama (`krama &&
  krama.length >= 1`), and in Rust and Go also only when `krama[0] >= 0`. An entry without krama
  neither saves nor retracts. That is the third kind `NO_KRAMA`. Three numeric constants in JS, a
  small enum in Rust, `int` constants in Go. If this reads worse than the inline block, keep the
  block inline (it is 12 lines) and only extract `is_single_vowel_krama(to_script_data, krama)`.
- `char_to_search` is built once per scan round and reused by the Tamil-Extended functions, as
  today. Do not rebuild it inside them.
- JS: `next_cps` is `number[] | null`. Rust and Go: `next_chars` is empty when there is none, the
  test is `!next_chars.is_empty()` / `len(nextChars) > 0`.
- Rust: `text_to_krama_item_index` is assigned through several `let` shadowings with `.filter` and
  a `match` with a guard. Turn each into the early return form above: it reads the same in the
  three languages.
- `sign_has_base` and `only_read_in_longer_text` exist as functions already. They move to the
  matcher file unchanged.
- The Tamil-Extended functions will stay at a complexity of about 15 to 20 each. That is fine:
  they are one idea each, with their examples in the comment. Do not split them further.

### 7.7 The main loop at the end

```ts
export const transliterate_text_core = (text, from_script_name, to_script_name, from_script_data,
    to_script_data, trans_options, custom_rules, options?) => {
  const ctx = create_transliterate_ctx(
    prepare_input_text(text, ...), from_script_name, to_script_name, from_script_data,
    to_script_data, trans_options, custom_rules, options
  );
  const { cursor } = ctx;
  const text_length = ctx.text_length;
  while (cursor.pos < text_length) {
    const char_index = cursor.pos;
    const cp = cursor.cpAt(char_index);
    if (cp === -1) break;
    const char_width = cpWidth(cp);

    if (skip_consumed_ta_ext_superscript(ctx, char_index, char_width)) continue;
    if (emit_passthrough_char(ctx, cp, char_index, char_width)) continue;

    // Step 1: the longest text of the text_to_krama_map
    const match_index = match_text_to_krama(ctx, cp, char_index, char_width);
    if (match_index !== -1) {
      if (emit_match(ctx, match_index, char_index)) continue;
    } else cursor.advance(char_width);

    // Step 2: the character (or the matched text) in the krama_text_arr
    emit_krama_char(ctx, cp, char_index, char_width, match_index);
  }
  flush_prev_context(ctx);

  const output = apply_custom_replace_rules(ctx.result.toString(), to_script_data, custom_rules, 'output');
  return { output, context_length: ctx.prev_context.length() };
};
```

The typing mode check (`typing_mode && from !== 'Normal'` → error / panic) stays at the top of
this function, before the text is prepared. Rust keeps the `buffers.put_chars(ctx.cursor.take_buffer())`
after the loop, Go the scratch hand back.

Add a module comment at the top of `transliterate.*` (the same text in the three languages) that
gives the pipeline in ten lines: prepare the input, pass-through characters, Step 1 (what the
matcher decides), `emit_match`, Step 2, the context (what `prev_context` stores and the three
modes), the custom rules (the replace pass on the input, the rules after each match, the replace
pass on the output). Today this overview exists nowhere.

## 8. What "done" means for the core

- The three test suites pass, plus the Python tests and the JS WASM / N-API tests after the
  bindings are rebuilt.
- The differential check is identical for the three languages.
- Benchmarks within noise of the baseline, numbers in the PR. `allocs/op` (Go) not higher.
- The complexity report before and after is in the PR. The main loop is under 40 lines.
- The same function names and the same seven files exist in the three languages. A table of
  "function → file" in the PR description, one row per function of section 7, three columns.
- No change in `git diff main --stat` outside: the three core folders, the two Rust import sites
  (if the paths are updated), CONTRIBUTING.md (if the report script is added), the changelogs
  (one line each: "internal: the transliteration core is split into smaller functions and files,
  no behaviour change").

## 9. Later phase: outside the core (smaller, lower priority)

Do this only after the core is merged. Each item is its own PR.

### 9.1 Typing data map (JS, Rust, Go)

`getScriptTypingDataMap` (`typing.ts` 964-1085, complexity 32), `get_script_typing_data_map`
(`typing.rs` 431-607, 138 lines), `GetScriptTypingDataMap` (`typing/data_map.go` 85, gocognit 53).
Not on a hot path, so only the tests matter (they exist in the three languages).

- Move `mergeDuplicateTextMappings` out of the function (JS nested closure, Rust nested `fn`, Go
  has it at package level already: `mergeDuplicateTextMappings`, `withoutEmptyText`).
- Extract `normal_krama_index(normal_script_data)` (the "first index of a text wins" map).
- Extract the body of the loop over `typing_text_to_krama_map` as
  `add_typing_key(res, multi_krama_keys, item, ...)`. Its four branches are: a custom script
  character, a key of one krama, a key of several krama, a prefix that is a character too. Write
  them as early returns, one comment each (the comments exist).
- Go keeps its file `typing/data_map.go`. For JS and Rust, move the two data map functions and
  `getScriptKramaData` into their own file (`typing_data_map.ts`, `typing/data_map.rs`) and
  re-export from `typing.ts` / `typing.rs`, so the layout is the same as Go.

### 9.2 JS `typing.ts` DOM handlers (JS only)

`handleTypingInputEvent` (complexity 34), `handleTypingBeforeInputEvent` (28), `flushElement`
(25). Read them fully before planning: they were not studied for this document. Likely cut: the
checks at the start of the two handlers (element, selection, composing, max length) as one
shared function, and "apply a `TypingDiff` to the element" as another. Tests:
`typing_dom.test.ts` (656 lines). Also remove the commented out "Old Approach without
`setRangeText`" block at the end of the file (from line 1087).

### 9.3 The script data generator (JS only)

`get_out_script_data` in `packages/js/src/make_script_data/make_output_script_data.ts`
(105-868): one function of complexity 169 and 620 lines, with a nested function
`add_to_text_to_krama_map` of complexity 42.

This one is the safest of all to refactor, because the check is exact: **the generated files must
be byte for byte the same**. Before: `bun run make-script-data`, copy `src/script_data/` and
`src/custom_options.json` aside. After each step: run it again, `diff -r`, and
`git status --short packages/rust/src packages/go` must show nothing (the Rust blob and the Go
gob files are committed and deterministic). No speed limit here.

The function already has its parts named in comments. Make each a function that takes the output
being built (`res`) and the input:

| New function | Comment that starts it today (function relative line) |
| --- | --- |
| `init_output(input)` | the first block (script type, base fields) |
| `add_to_text_to_krama_map(res, ...)` at module level | line 39. Split its loop body: `find_existing_entry`, `extend_existing_entry`, `add_new_entry` |
| `prefill_from_manual_krama_text_map` | "Part 1", line 152 |
| `warn_duplicate_list_texts` | "Scan for multiple same text attributes", line 166 |
| `fill_from_list_item` (called in the loop over `list`), with `add_item_duplicates` and `add_item_fallback` | "Part 2", "Part 3", "Part 4", lines 187-290 |
| `add_multi_char_krama_texts` | "Scan the krama_text_map for keys which are two characters+", line 291 |
| `resolve_unread_prefixes` | "A prefix (of two or more code points) of a longer text…", line 337 |
| `add_normalization_variants` | "Canonically equivalent forms (Unicode NFD / NFC)…", line 418 |
| `mark_vyanjana_halant_prefixes_as_anya` | "An intermediate entry … vyanjana + halant", line 489 |
| `build_typing_data` with its three steps | "typing data genertion", Step 1 to Step 3, line 511 |
| `optimize_text_to_krama_map`, `add_romanized_sh_krama`, `remove_single_char_entries` | "Part 5" and the two blocks after it |
| `warn_duplicate_text_keys`, `warn_unmapped_krama_keys`, `warn_minus_one_krama` | the three "Scan for … and warn" blocks |
| `add_dev_fields` | "In Dev mode add the original krama key…" |

The two places that build a `readable` map (text → krama, the texts that are read) do almost the
same thing: check whether one helper can serve both without changing the output.

## 10. Differences between the languages (found while reading, do not fix in this refactor)

Each language keeps its behaviour. Put this list in the umbrella PR so the maintainer can decide
on follow ups. None is known to change the output of a test.

1. **Clearing the context on the last call.** Rust (`item.is_none() || anya`) and Go
   (`lastExtraCall || anya`) clear the context when it ends with vyanjana (+ nuqta) + mAtrA and
   there is no item. JS only tests `item_type === 'anya'`, so it does not clear on the last call.
   The output is the same (no emit depends on it), but the returned `context_length` can differ
   (JS 2 or 3, Rust and Go 0) for a brahmic source ending in a consonant + vowel sign. Typing
   mode always has `Normal` as the source, where a mAtrA type in the context is rare.
2. **Rust `prev_context_cleanup`, brahmic → other**: the nuqta form of the "previous is a
   vyanjana" test checks `brahmic_halant.is_some()` (line 232), JS and Go check the nuqta. Same
   result, it is a slip of the pen.
3. **Rules with a negative index.** Rust and Go skip a `replace_prev_krama_keys` rule when any
   `prev` index is negative, and a `direct_replace` search group with a negative index. JS has no
   such test.
4. **`check_in` missing on a rule.** JS does nothing for a `replace_prev_krama_keys` rule whose
   `check_in` is neither `'input'` nor `'output'`. Rust and Go read "not output" as input.
5. **`apply_custom_replace_rules` with an empty search text.** Rust skips an empty
   `to_replace_string`. JS would call `replaceAll('', …)`. Go: check when moving the function.
6. **JS custom character block**: no bounds check on `custom_script_chars_arr[map.custom_back_ref]`
   (Rust and Go have one), and the dead test `custom_options_json !== null` (removed in 7.4).
7. **The match start that Step 2 gives to the custom rules** is "one character before the cursor"
   in the three languages. When Step 2 reads a matched text of several characters (an entry of
   the map without krama, found again in `krama_text_arr`), that is the last character of the
   match, not its start. An input side `replace_prev_krama_keys` rule then compares `prev` from
   the wrong place. No test shows a wrong output, it may be unreachable with the present data.

Dead code seen (optional cleanup, a separate small commit, only if the maintainer agrees):
Rust `is_single_ascii_digit`, `ResultStringBuilder::new`, `krama_text_or_null`, `last_text`,
`last_type`, `is_last_type`, `peek_at_offset_units`, `get_common_attr` (all `#[allow(dead_code)]`);
JS `cursor.peek`, `cursor.peekAtOffsetUnits`, `prev_context.lastText / lastType / isLastType`.

## 11. Order of work and PRs

| # | PR (into the umbrella branch) | Contains |
| --- | --- | --- |
| 0 | none (local) | Phase 0: differential corpus, golden files, benchmark baseline, complexity "before" |
| 1 | `refactor/core-js` | JS S1 to S8 |
| 2 | `refactor/core-rust` | Rust S1 to S8, bindings rebuilt, Python and JS binding tests |
| 3 | `refactor/core-go` | Go S1 to S8 |
| 4 | `refactor/core-docs` | the module comment of 7.7 in the three languages if not done, the optional report script, changelog lines, the "function → file" table |
| later | separate PRs into `main` | section 9.1, 9.2, 9.3 |

After PR 3, read the three implementations side by side one more time, function by function, and
make the names, the parameter order and the order of the functions in each file the same. This
last pass is what makes the mirror useful: a fix in one language can then be ported by reading
the same function in the other two.

## 12. Options left open (the implementer may choose, say which in the PR)

- **`vowel_retraction_kind`** as a function with three results, or the 12 lines inline (7.6).
- **One or two Tamil-Extended emit functions** (multi piece and one piece), depending on what the
  Rust borrow checker and the benchmarks allow (7.5).
- **Rust import paths**: re-export from `transliterate.rs`, or update `typing.rs` and
  `script_data/mod.rs` (section 5).
- **Where the pass-through steps and `emit_match` live**: in `transliterate.*` as written here, or
  in an eighth file `emit.*` if `transliterate.*` goes over about 450 lines.
- **`prev_context_in_use`**: keep as a field computed from the mode, or write `mode != None` at
  the few places left.
