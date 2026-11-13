import type { ScriptData } from '../utils/get_script_data';
import type { script_list_type } from '../utils/lang_list';
import type { CustomOptionType, CustomRulesType } from './options';
import {
  emitPiecesWithReorder,
  isScriptTamilExt,
  isTaExtSuperscriptTail,
  kramaIndexOfText,
  kramaTextOrEmpty,
  make_input_cursor,
  prev_context_builder,
  string_builder,
  textToKramaMapIndex,
  STANDARD_SCHEMES,
  ZWJ
} from './helpers';

export type ListItem = ScriptData['list'][number];
export type TextToKramaItem =
  | ScriptData['text_to_krama_map'][number]
  | ScriptData['typing_text_to_krama_map'][number];

/**
 * How the previous context (`prev_context`) is used, from the types of the two scripts.
 * It is in use in every mode but `MODE_NONE`.
 */
export type ContextMode = 0 | 1 | 2 | 3;
/** brahmic -> brahmic, or other -> other without typing: no context */
export const MODE_NONE = 0;
/** the inherent vowel (schwa) is written after a vyanjana */
export const MODE_BRAHMIC_TO_OTHER = 1;
/** a vowel after a vyanjana is its mAtrA, a vyanjana without a vowel takes the halant */
export const MODE_OTHER_TO_BRAHMIC = 2;
/** typing (`Normal`) into an `other` script: only the length of the context is used */
export const MODE_TYPING_TO_OTHER = 3;

/** Everything a transliteration call works with: the data, the options resolved once, and the
 * state of the pass over the input */
export type TransliterateCtx = {
  from_script_name: script_list_type;
  to_script_name: script_list_type;
  from_script_data: ScriptData;
  to_script_data: ScriptData;
  trans_options: CustomOptionType;
  custom_rules: CustomRulesType;
  cursor: ReturnType<typeof make_input_cursor>;
  result: ReturnType<typeof string_builder>;
  /** It stores the previous attribute types of the brahmic scripts
   * Use only when converted Brahmic -> Other or Other -> Brahmic
   * Stores attributes of the Brahmic script like svara, vyanjana, anya not of the Other script
   * and the characters match text of the brahmic script
   *
   * **Note** :- The text stores the contents of the `text` (not `result_str`) but the type
   * stores the attributes of the brahmic script (in both cases)
   */
  prev_context: ReturnType<typeof prev_context_builder>;
  /** length of the (prepared) input text, in UTF-16 units */
  text_length: number;
  mode: ContextMode;
  /** nuqta of the brahmic script of the pair, `null` if it has none (or no brahmic side) */
  BRAHMIC_NUQTA: string | null;
  /** halant of the brahmic script of the pair */
  BRAHMIC_HALANT: string | null;
  /** inherent vowel of the `other` target script (`''` for a brahmic target) */
  schwa_character: string;
  typing_mode: boolean;
  include_inherent_vowel: boolean;
  use_native_numerals: boolean;
  is_from_tamil_ext: boolean;
  is_to_tamil_ext: boolean;
  /** typing mode, or the `normal_to_all:use_typing_chars` option */
  use_typing_chars: boolean;
  /** use typing map when Normal -> All in typing mode (or with explicit typing chars option) */
  use_typing_map: boolean;
  /** the script data whose (typing) text to krama map is looked up */
  lookup_data: ScriptData;
  /** The map whose indices the lookups (`textToKramaMapIndex`, ...) return */
  text_to_krama_map: TextToKramaItem[];
  /** code points of the `next` list of each entry of `text_to_krama_map` */
  text_to_krama_next_cps: (number[] | null)[];
  from_is_other: boolean;
  /** `~` is a letter in some romanization schemes (Harvard-Kyoto candrabindu, ITRANS `~N`),
   * there it is read instead of skipped */
  tilde_is_text: boolean;
  /** Between two romanizations, one of them a standard scheme, ॐ is read only at the start of a
   * word (there is no vyanjana context to tell `logoṃ` लोगों from ॐ). Normal and Romanized are
   * kept as they were. */
  om_only_at_word_start: boolean;
  /** the `all_to_normal:preserve_specific_chars` option, to `Normal` */
  preserve_specific_chars: boolean;
  /** `direct_replace` and input side `replace_prev_krama_keys` rules are applied after every
   * piece of a match */
  has_in_match_rules: boolean;
  /** the `all_to_sinhala:use_conjunct_enabling_halant` option, to `Sinhala` */
  sinhala_conjunct_halant: boolean;
  /** Index of a Tamil-Extended superscript that was read with the match before it (a halant, a
   * mAtrA or Vedic svaras are written in between), to be skipped when the cursor gets there.
   * `-1` if none. Used when converting from tamil extended. Only the main loop writes it (from
   * the result of Step 1), the matcher reads it. */
  ta_ext_skip_index: number;
  /** Result of Step 1 (`match_text_to_krama`, which sets the two on every call, a second and
   * third return value without an allocation): index of the Tamil-Extended superscript read with
   * the match, which is not next to it in the input. `-1` if none */
  matched_superscript_index: number;
  /** Result of Step 1: only Vedic svaras are between the match and its superscript, and no
   * superscript was being skipped, so the superscript is not advanced over with the match */
  matched_superscript_detached: boolean;
};

/**
 * @param text the prepared input (typing aliases and the input replace rules applied)
 */
export function create_transliterate_ctx(
  text: string,
  from_script_name: script_list_type,
  to_script_name: script_list_type,
  from_script_data: ScriptData,
  to_script_data: ScriptData,
  trans_options: CustomOptionType,
  custom_rules: CustomRulesType,
  typing_mode: boolean,
  use_native_numerals: boolean,
  include_inherent_vowel: boolean
): TransliterateCtx {
  let mode: ContextMode = MODE_NONE;
  let BRAHMIC_NUQTA: string | null = null;
  let BRAHMIC_HALANT: string | null = null;
  if (from_script_data.script_type === 'brahmic' && to_script_data.script_type === 'other') {
    mode = MODE_BRAHMIC_TO_OTHER;
    BRAHMIC_NUQTA = from_script_data.nuqta ?? null;
    BRAHMIC_HALANT = from_script_data.halant;
  } else if (from_script_data.script_type === 'other' && to_script_data.script_type === 'brahmic') {
    mode = MODE_OTHER_TO_BRAHMIC;
    BRAHMIC_NUQTA = to_script_data.nuqta ?? null;
    BRAHMIC_HALANT = to_script_data.halant;
  } else if (
    typing_mode &&
    from_script_name === 'Normal' &&
    to_script_data.script_type === 'other'
  ) {
    mode = MODE_TYPING_TO_OTHER;
  }

  // Avoid mutating the caller's options object; use a local flag instead.
  const use_typing_chars = typing_mode || trans_options['normal_to_all:use_typing_chars'] === true;
  // use typing map when Normal -> All in typing mode (or with explicit typing chars option)
  const use_typing_map = use_typing_chars && from_script_name === 'Normal';
  const lookup_data = use_typing_map ? to_script_data : from_script_data;

  return {
    from_script_name,
    to_script_name,
    from_script_data,
    to_script_data,
    trans_options,
    custom_rules,
    cursor: make_input_cursor(text),
    result: string_builder(),
    prev_context: prev_context_builder(),
    text_length: text.length,
    mode,
    BRAHMIC_NUQTA,
    BRAHMIC_HALANT,
    schwa_character: to_script_data.script_type === 'other' ? to_script_data.schwa_character : '',
    typing_mode,
    include_inherent_vowel,
    use_native_numerals,
    is_from_tamil_ext: isScriptTamilExt(from_script_name),
    is_to_tamil_ext: isScriptTamilExt(to_script_name),
    use_typing_chars,
    use_typing_map,
    lookup_data,
    text_to_krama_map: use_typing_map
      ? to_script_data.typing_text_to_krama_map
      : from_script_data.text_to_krama_map,
    text_to_krama_next_cps: use_typing_map
      ? to_script_data.next_cps_typing_text_to_krama_map
      : from_script_data.next_cps_text_to_krama_map,
    from_is_other: from_script_data.script_type === 'other',
    tilde_is_text:
      textToKramaMapIndex(lookup_data, '~', use_typing_map) !== -1 ||
      kramaIndexOfText(from_script_data, '~') !== -1,
    om_only_at_word_start:
      from_script_data.script_type === 'other' &&
      to_script_data.script_type === 'other' &&
      (STANDARD_SCHEMES.includes(from_script_name) || STANDARD_SCHEMES.includes(to_script_name)),
    preserve_specific_chars:
      trans_options['all_to_normal:preserve_specific_chars'] === true &&
      to_script_name === 'Normal',
    has_in_match_rules: custom_rules.some(
      (rule) =>
        rule.use_replace !== true && (rule.type === 'direct_replace' || rule.check_in === 'input')
    ),
    sinhala_conjunct_halant:
      to_script_name === 'Sinhala' &&
      trans_options['all_to_sinhala:use_conjunct_enabling_halant'] === true,
    ta_ext_skip_index: -1,
    matched_superscript_index: -1,
    matched_superscript_detached: false
  };
}

/** The last context item is a vyanjana, or a vyanjana + nuqta */
export function prev_ends_with_vyanjana(ctx: TransliterateCtx): boolean {
  const { prev_context, BRAHMIC_NUQTA } = ctx;
  return (
    prev_context.typeAt(-1) === 'vyanjana' ||
    (!!BRAHMIC_NUQTA &&
      prev_context.typeAt(-2) === 'vyanjana' &&
      prev_context.textAt(-1) === BRAHMIC_NUQTA)
  );
}

/** The result ends with a Tamil-Extended superscript (a mAtrA, halant or Vedic svara written
 * next goes before it) */
export function result_ends_with_ta_ext_superscript(ctx: TransliterateCtx): boolean {
  return ctx.is_to_tamil_ext && isTaExtSuperscriptTail(ctx.result.lastChar());
}

/** Emits the (skipped) halant in other -> brahmic conversion */
export function emit_halant(ctx: TransliterateCtx) {
  const halant = ctx.BRAHMIC_HALANT!;
  emitPiecesWithReorder(ctx.result, [halant], halant, result_ends_with_ta_ext_superscript(ctx));
  if (ctx.sinhala_conjunct_halant) {
    ctx.result.rewriteAt(-1, ctx.result.lastPiece() + ZWJ);
  }
}

/** The text of a match as it is stored in the context: a match which is the halant (a halant
 * variant matched as a whole, or the halant typed by its own key) is stored as the halant itself */
export function context_text_of_match(
  script_data: ScriptData,
  krama: readonly number[],
  matched_text: string,
  halant: string | null
): string {
  return halant !== null && krama.length === 1 && kramaTextOrEmpty(script_data, krama[0]) === halant
    ? halant
    : matched_text;
}

/** vyanjana (+ nuqta) + mAtrA in the context: the syllable is complete, an `anya` after it starts
 * with an empty context */
function clear_context_after_matra(ctx: TransliterateCtx) {
  const { prev_context, BRAHMIC_NUQTA } = ctx;
  if (
    // vyanjana, nuqta, svara
    (BRAHMIC_NUQTA &&
      prev_context.typeAt(-3) === 'vyanjana' &&
      prev_context.textAt(-2) === BRAHMIC_NUQTA &&
      prev_context.typeAt(-1) === 'mAtrA') ||
    // or vyanjana, svara
    (prev_context.typeAt(-2) === 'vyanjana' && prev_context.typeAt(-1) === 'mAtrA')
  ) {
    prev_context.clear();
  }
}

/** brahmic -> other: the inherent vowel of the vyanjana before the item, when the item is not
 * its mAtrA or halant */
function emit_pending_schwa(
  ctx: TransliterateCtx,
  item_text: string | undefined,
  item_type: ListItem['type'] | undefined
) {
  const { BRAHMIC_HALANT, BRAHMIC_NUQTA } = ctx;
  // Short-circuit chain ordered cheapest/most selective first (all checks are pure).
  // Since `item_text !== halant` is required, the former "to anya or null" check
  // (`(type !== mAtrA && text !== halant) || anya || null`) reduces to `type !== mAtrA`.
  if (
    item_type !== 'mAtrA' &&
    // vyanjana or vyanjana, nuqta
    prev_ends_with_vyanjana(ctx) &&
    // two special cases to ignore
    item_text !== BRAHMIC_HALANT! &&
    (!BRAHMIC_NUQTA || item_text !== BRAHMIC_NUQTA) &&
    (!ctx.is_from_tamil_ext || !item_text || item_text.charAt(0) !== BRAHMIC_HALANT!)
  ) {
    ctx.result.emit(ctx.schwa_character);
  }
}

/**
 * other -> brahmic: a vowel after a vyanjana is written as its mAtrA, else the vyanjana takes
 * the halant.
 * @returns `true` when the item (the mAtrA) was written to the result here
 */
function join_to_prev_vyanjana(
  ctx: TransliterateCtx,
  item_text: string | undefined,
  item_list: ListItem | null | undefined
): boolean {
  const item_type = item_list?.type;
  const prev_is_vyanjana = ctx.prev_context.typeAt(-1) === 'vyanjana';
  if (prev_is_vyanjana && (item_type === 'mAtrA' || item_type === 'svara')) {
    const linked_mAtrA =
      item_list!.type === 'svara'
        ? kramaTextOrEmpty(ctx.to_script_data, item_list!.mAtrA_krama_ref?.[0] ?? -1)
        : item_text!;
    emitPiecesWithReorder(
      ctx.result,
      [linked_mAtrA],
      ctx.BRAHMIC_HALANT!,
      result_ends_with_ta_ext_superscript(ctx)
    );
    return true;
  }
  if (
    // default transliteration behavior (without schwa deletion)
    (!ctx.include_inherent_vowel &&
      prev_is_vyanjana &&
      item_type !== 'mAtrA' &&
      item_text !== ctx.BRAHMIC_HALANT) ||
    // if to include inherent vowel then check when to add that skipped halant
    (ctx.include_inherent_vowel && item_type === 'vyanjana' && prev_ends_with_vyanjana(ctx))
  ) {
    emit_halant(ctx);
  }
  return false;
}

/** The typing mode context clear, then the item is added to the context */
function update_prev_context(
  ctx: TransliterateCtx,
  item_text: string | undefined,
  item_type: ListItem['type'] | undefined,
  next: string[] | null | undefined,
  emits_ta_ext_superscript_tail: boolean
) {
  if (!ctx.typing_mode) {
    ctx.prev_context.push(item_text, item_type);
    return;
  }
  // custom typing mode context clear logic
  // only clear context if there are no next characters
  if (
    (next === undefined || next === null || next.length === 0) &&
    // the case below is to enable typing of _, ' (Vedic svara chihnas too)
    !(
      ctx.is_to_tamil_ext &&
      (emits_ta_ext_superscript_tail || isTaExtSuperscriptTail(ctx.result.lastChar()))
    ) &&
    // do not clear the context only if case where the current added element is a vyanjana
    item_type !== 'vyanjana'
  ) {
    ctx.prev_context.clear();
    return;
  }
  ctx.prev_context.push(item_text, item_type);
}

/**
 * Called before an item is written: writes what the context still owes (the inherent vowel, the
 * halant, or the item itself as a mAtrA), then adds the item to the context.
 *
 * @param item_text text of the current item (stored in the context)
 * @param item_list list item (type info) of the current item
 * @param next the keys that can follow the item (typing mode: the context is kept while more
 * keys can follow)
 * @param emits_ta_ext_superscript_tail the text of the current item (emitted after this call)
 * ends with a Tamil-Extended superscript, eg `RR` -> `ரூ²`. Like when the superscript is already
 * the last character, the typing context is kept so that a Vedic svara typed next goes before it.
 * @return flag to indicate if the result concat has to be done as it already is concatenated here.
 */
export function prev_context_cleanup(
  ctx: TransliterateCtx,
  item_text: string | undefined,
  item_list: ListItem | null | undefined,
  next: string[] | null | undefined = null,
  emits_ta_ext_superscript_tail: boolean = false
): boolean {
  const item_type = item_list?.type;
  // (on the last call, `flush_prev_context`, the Rust and Go versions also clear here)
  if (item_type === 'anya') clear_context_after_matra(ctx);
  let result_str_concat_status = false;
  if (ctx.mode === MODE_BRAHMIC_TO_OTHER) emit_pending_schwa(ctx, item_text, item_type);
  else if (ctx.mode === MODE_OTHER_TO_BRAHMIC)
    result_str_concat_status = join_to_prev_vyanjana(ctx, item_text, item_list);
  update_prev_context(ctx, item_text, item_type, next, emits_ta_ext_superscript_tail);
  return result_str_concat_status;
}

/** After the last character: the inherent vowel / halant still owed to a trailing vyanjana.
 * Nothing is added to the context. */
export function flush_prev_context(ctx: TransliterateCtx) {
  if (ctx.mode === MODE_BRAHMIC_TO_OTHER) emit_pending_schwa(ctx, undefined, undefined);
  else if (ctx.mode === MODE_OTHER_TO_BRAHMIC) join_to_prev_vyanjana(ctx, undefined, null);
}
