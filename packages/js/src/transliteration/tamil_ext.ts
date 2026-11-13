/**
 * Tamil-Extended: an aspirated / voiced consonant is the Tamil consonant + a superscript number
 * (க² is ख), and the writer puts the halant, the mAtrA and the Vedic svaras **before** the
 * superscript (க்² is ख्, கி⁴ is घि). So going from it the superscript is read with the consonant
 * before these, and going to it these are written before the superscript already in the result.
 */
import type { TransliterateCtx, TextToKramaItem } from './context';
import {
  cpWidth,
  emitPiecesWithReorder,
  isMatraCp,
  isTaExtSuperscriptTail,
  isTaExtSuperscriptTailCp,
  isVedicSvaraTail,
  isVedicSvaraTailCp,
  kramaTextOrEmpty,
  listItemOfKrama,
  textToKramaMapIndex
} from './helpers';

/**
 * Step 1, from Tamil-Extended: the match followed by a superscript that comes after a halant or
 * a mAtrA and Vedic svaras, as the writer puts them before it:
 * `[halant | mAtrA | mAtrA mAtrA]? svara* superscript`
 *
 * eg. க்² (ख्), கி⁴ (घि), கொ⁴ (घो as ெ + ா), க॒॑⁴ (घ॒॑), க்॒² (ख्॒), கி॒⁴ (घि॒), ரு॒॑² (ऋ॒॑)
 *
 * In the match the superscript takes the place of these, which are read next. On a match sets
 * the superscript results of Step 1, `ctx.matched_superscript_index` (the loop skips it when the
 * cursor gets there) and `ctx.matched_superscript_detached`.
 *
 * @param next the characters that can continue the current match
 * @param char_to_search the text of the current match
 * @param end_index index after the current match
 * @returns index in `text_to_krama_map` of the match with the superscript, `-1` if this is not the case
 */
export function ta_ext_match_with_superscript(
  ctx: TransliterateCtx,
  halant: string,
  next: string[],
  char_to_search: string,
  end_index: number
): number {
  const { cursor, from_script_data } = ctx;
  let sup_index = end_index;
  const sign_cp = cursor.cpAt(sup_index);
  const has_sign =
    sign_cp !== -1 &&
    (String.fromCodePoint(sign_cp) === halant || isMatraCp(from_script_data, sign_cp));
  if (has_sign) {
    sup_index += cpWidth(sign_cp);
    const second_cp = cursor.cpAt(sup_index);
    // mAtrA duplicates like O = E + A in gEA (or gO as visible when)
    if (
      isMatraCp(from_script_data, sign_cp) &&
      second_cp !== -1 &&
      isMatraCp(from_script_data, second_cp)
    )
      sup_index += cpWidth(second_cp);
  }
  const svaras_start = sup_index;
  while (isVedicSvaraTailCp(cursor.cpAt(sup_index))) sup_index += 1; // single UTF-16 units
  const sup_cp = cursor.cpAt(sup_index);
  if (
    !(has_sign || sup_index > svaras_start) ||
    !isTaExtSuperscriptTailCp(sup_cp) ||
    // no superscript is being skipped, or (with only svaras in between) the skipped one
    // is inside this match: the ² of க்² in க்²ரு॑² (खृ॑)
    !(ctx.ta_ext_skip_index === -1 || (!has_sign && ctx.ta_ext_skip_index < end_index))
  )
    return -1;
  const sup_character = String.fromCharCode(sup_cp);
  const match_index =
    next.indexOf(sup_character) !== -1
      ? textToKramaMapIndex(from_script_data, char_to_search + sup_character)
      : -1;
  if (match_index === -1) return -1;
  // With only svaras in between, a superscript already skipped inside this match
  // (the ² of க்² in க்²ரு॑²) makes up for the one after the svaras in the match
  // length, so the whole match is advanced over.
  ctx.matched_superscript_detached = !has_sign && ctx.ta_ext_skip_index === -1;
  ctx.matched_superscript_index = sup_index;
  return match_index;
}

/**
 * Step 1, from Tamil-Extended: the match ends with a halant, or a halant + a letter, that cannot
 * be continued (ல் and ல்ர are the start of ல்ரி² ல்ரீ² (ऌ ॡ)), but the halant starts a mAtrA
 * ending in a superscript (்ரு² ்ரூ² ்ல்ரி² ்ல்ரீ²): stop the match before the halant, so ல்ரு² is
 * read as ல + ்ரு² (लृ) and ல்ல்ரி² as ல + ்ல்ரி² (लॢ, like க்ல்ரி² कॢ)
 *
 * @param char_to_search the text of the current match
 * @param end_index index after the current match
 * @param nth_next_cp the code point at `end_index`
 * @param next_cps the code points that can continue the current match
 * @returns index in `text_to_krama_map` of the text before the halant, `-1` if this is not the case
 */
export function ta_ext_split_before_halant_matra(
  ctx: TransliterateCtx,
  halant: string,
  char_to_search: string,
  end_index: number,
  nth_next_cp: number,
  next_cps: number[]
): number {
  const { cursor, from_script_data } = ctx;
  const halant_back =
    char_to_search.at(-1) === halant ? 1 : char_to_search.at(-2) === halant ? 2 : 0;
  if (
    halant_back === 0 ||
    nth_next_cp === -1 ||
    next_cps.includes(nth_next_cp) ||
    char_to_search.length <= halant_back ||
    cursor.slice(end_index - halant_back, end_index) !== char_to_search.slice(-halant_back)
  )
    return -1;
  // the longest text from the halant up to the superscript (after Vedic svaras)
  let tail = char_to_search.slice(-halant_back);
  let tail_end = end_index;
  while (true) {
    const tail_cp = cursor.cpAt(tail_end);
    if (tail_cp === -1 || isTaExtSuperscriptTailCp(tail_cp)) break;
    const longer = tail + String.fromCodePoint(tail_cp);
    if (textToKramaMapIndex(from_script_data, longer) === -1) break;
    tail = longer;
    tail_end += cpWidth(tail_cp);
  }
  while (isVedicSvaraTailCp(cursor.cpAt(tail_end))) tail_end += 1;
  const tail_sup_cp = cursor.cpAt(tail_end);
  const tail_krama = isTaExtSuperscriptTailCp(tail_sup_cp)
    ? from_script_data.text_to_krama_map[
        textToKramaMapIndex(from_script_data, tail + String.fromCharCode(tail_sup_cp))
      ]?.[1].krama
    : null;
  const head_index = textToKramaMapIndex(from_script_data, char_to_search.slice(0, -halant_back));
  if (
    head_index !== -1 &&
    tail_krama?.length === 1 &&
    listItemOfKrama(from_script_data, tail_krama[0])?.type === 'mAtrA'
  )
    return head_index;
  return -1;
}

/**
 * The UTF-16 units of the matched text that are not advanced over: `1` when it ends with a
 * superscript that is not next to the rest of it in the input (it is skipped later, see
 * `ctx.ta_ext_skip_index`), else `0`.
 */
export function ta_ext_unconsumed_superscript_units(
  ctx: TransliterateCtx,
  matched_text: string,
  map: TextToKramaItem[1]
): number {
  // condtional subtarct 1 when a superscript number is present in the current match
  // (only relevant while skipping a Tamil-Extended superscript)
  return ctx.matched_superscript_detached ||
    (ctx.ta_ext_skip_index !== -1 &&
      matched_text.length > 1 &&
      listItemOfKrama(ctx.from_script_data, map.krama?.[0] ?? -1)?.type === 'vyanjana' &&
      isTaExtSuperscriptTail(matched_text.at(-1) ?? undefined))
    ? 1
    : 0;
}

/**
 * To Tamil-Extended, the result ends with a superscript: emits the texts of `krama`, a mAtrA /
 * halant or a Vedic svara goes before the superscript.
 */
export function emit_krama_after_ta_ext_superscript(
  ctx: TransliterateCtx,
  krama: readonly number[]
) {
  const { result, to_script_data } = ctx;
  // Tamil-Extended output reorder (mAtrA/halant after superscript)
  // only this path needs the pieces as an array
  const result_pieces_to_add = krama.map((krama_index) =>
    kramaTextOrEmpty(to_script_data, krama_index)
  );
  if (
    to_script_data.script_type === 'brahmic' &&
    (listItemOfKrama(to_script_data, krama.at(-1) ?? -1)?.type === 'mAtrA' ||
      result_pieces_to_add.join('') === to_script_data.halant)
  ) {
    emitPiecesWithReorder(result, result_pieces_to_add, to_script_data.halant!, true);
  } else if (isVedicSvaraTail(result_pieces_to_add.at(-1)?.at(-1) ?? '')) {
    const last = result.popLastChar();
    result.emitPieces(result_pieces_to_add);
    result.emit(last ?? '');
  } else {
    result.emitPieces(result_pieces_to_add);
  }
}

/**
 * `emit_krama_after_ta_ext_superscript` for the text of one krama index (Step 2).
 */
export function emit_piece_after_ta_ext_superscript(ctx: TransliterateCtx, krama_index: number) {
  const { result, to_script_data } = ctx;
  const to_add_text = kramaTextOrEmpty(to_script_data, krama_index);
  // In tamil Extended check if the current one is a halant or a svara(mAtrA)
  if (
    to_script_data.script_type === 'brahmic' &&
    (listItemOfKrama(to_script_data, krama_index)?.type === 'mAtrA' ||
      to_add_text === to_script_data.halant)
  ) {
    emitPiecesWithReorder(result, [to_add_text], to_script_data.halant!, true);
  } else if (isVedicSvaraTail(to_add_text)) {
    const last = result.popLastChar();
    result.emit(to_add_text);
    result.emit(last ?? '');
  } else {
    result.emit(to_add_text);
  }
}
