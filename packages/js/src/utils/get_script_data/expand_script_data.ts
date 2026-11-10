import type {
  ExpandedBrahmicScriptData,
  ExpandedOtherScriptData,
  ExpandedScriptData,
  KramaType,
  OutputScriptData,
  SharedScriptData
} from '../../make_script_data/output_script_data_schema';

type ListItem = ExpandedBrahmicScriptData['list'][number];
/** A value of the stored `text_to_krama_map` or `typing_text_to_krama_map` */
type StoredValue = {
  next?: string[];
  krama?: number[];
  custom_back_ref?: number;
  type?: KramaType;
  mAtrA_krama?: number;
};
type ExpandedValue = ExpandedScriptData['typing_text_to_krama_map'][number][1];

/** Order of the text keys in the maps: UTF-16 code unit order */
export const compare_text = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The typing map of a script: the shared entries with the entries of the script applied over
 * them (an entry replaces or adds, `null` removes), sorted by text.
 */
export const merge_typing_text_to_krama_map = (
  shared: SharedScriptData['typing_text_to_krama_map'],
  script: NonNullable<OutputScriptData['typing_text_to_krama_map']>
) => {
  const merged = new Map(shared);
  for (const [text, value] of script) {
    if (value === null) merged.delete(text);
    else merged.set(text, value);
  }
  return [...merged].sort((a, b) => compare_text(a[0], b[0]));
};

/**
 * Builds the shape the transliteration works on from the stored data of a script and the data
 * shared by the scripts (see `output_script_data_schema.ts`).
 *
 * The `list` has one item for each type in use (and for each svara with a different mAtrA),
 * only the `type` and the `mAtrA_krama_ref` of an item are read by the runtimes.
 */
export const expand_script_data = (
  data: OutputScriptData,
  shared: SharedScriptData
): ExpandedScriptData => {
  const list: ListItem[] = [];
  const list_refs = new Map<string, number>();
  /** index of the list item of the type (added on first use) */
  const get_list_ref = (type: KramaType, mAtrA_krama?: number) => {
    const key = type === 'svara' ? `svara ${mAtrA_krama ?? -1}` : type;
    let ref = list_refs.get(key);
    if (ref === undefined) {
      ref = list.length;
      list.push(
        type === 'svara'
          ? {
              krama_ref: [],
              type,
              mAtrA_krama_ref: mAtrA_krama === undefined || mAtrA_krama < 0 ? [] : [mAtrA_krama]
            }
          : { krama_ref: [], type }
      );
      list_refs.set(key, ref);
    }
    return ref;
  };

  // only brahmic scripts have types
  const is_brahmic = data.script_type === 'brahmic';
  const krama_type_overrides = new Map(
    data.script_type === 'brahmic' ? data.krama_type_overrides : undefined
  );
  const svara_mAtrA_krama_overrides = new Map(
    data.script_type === 'brahmic' ? data.svara_mAtrA_krama_overrides : undefined
  );
  const krama_text_arr: ExpandedScriptData['krama_text_arr'] = data.krama_text_arr.map(
    (text, krama_index) => {
      if (!is_brahmic) return [text, null];
      const type = krama_type_overrides.has(krama_index)
        ? krama_type_overrides.get(krama_index)
        : shared.krama_type_arr[krama_index];
      if (type === null || type === undefined) return [text, null];
      const ref = get_list_ref(
        type,
        // the mAtrA of a svara is the next krama index
        type === 'svara'
          ? (svara_mAtrA_krama_overrides.get(krama_index) ?? krama_index + 1)
          : undefined
      );
      list[ref].krama_ref.push(krama_index);
      return [text, ref];
    }
  );

  const expand_value = (value: StoredValue): ExpandedValue => {
    const expanded: ExpandedValue = {};
    if (value.next) expanded.next = value.next;
    if (value.krama) expanded.krama = value.krama;
    if (value.custom_back_ref !== undefined) expanded.custom_back_ref = value.custom_back_ref;
    if (value.type) expanded.fallback_list_ref = get_list_ref(value.type, value.mAtrA_krama);
    return expanded;
  };

  const text_to_krama_map: ExpandedScriptData['text_to_krama_map'] = data.text_to_krama_map.map(
    ([text, value]) => [text, expand_value(value)]
  );
  const typing_text_to_krama_map: ExpandedScriptData['typing_text_to_krama_map'] =
    data.typing_text_to_krama_map === undefined
      ? []
      : merge_typing_text_to_krama_map(
          shared.typing_text_to_krama_map,
          data.typing_text_to_krama_map
        ).map(([text, value]) => [text, expand_value(value)]);

  const typing_index = new Map<string, number>();
  for (let i = 0; i < typing_text_to_krama_map.length; i++)
    typing_index.set(typing_text_to_krama_map[i][0], i);
  const custom_script_chars_arr: ExpandedScriptData['custom_script_chars_arr'] =
    data.custom_script_chars_arr.map(([text, type, normal_key]) => [
      text,
      type === null ? null : get_list_ref(type),
      normal_key === null ? null : (typing_index.get(normal_key) ?? null)
    ]);

  if (data.script_type === 'brahmic') {
    return {
      script_type: 'brahmic',
      script_name: data.script_name,
      script_id: data.script_id,
      halant: data.halant,
      ...(data.nuqta === undefined ? {} : { nuqta: data.nuqta }),
      schwa_property: data.schwa_property,
      text_to_krama_map,
      list,
      krama_text_arr,
      typing_text_to_krama_map,
      custom_script_chars_arr
    };
  }
  return {
    script_type: 'other',
    script_name: data.script_name,
    script_id: data.script_id,
    schwa_character: data.schwa_character,
    text_to_krama_map,
    // `other` scripts have no types
    list: list as ExpandedOtherScriptData['list'],
    krama_text_arr,
    typing_text_to_krama_map,
    custom_script_chars_arr
  };
};
