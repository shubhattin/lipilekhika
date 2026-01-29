import { type ScriptListType, type TransliterationOptions } from 'lipilekhika';

type Rule = keyof TransliterationOptions;

export type PresetListType = 'none' | 'tsc_portal';
type Preset = Record<
  PresetListType,
  {
    label: string;
    description?: string;
    direct_apply_rules: Rule[];
    conditional_rules: {
      rule: Rule;
      from: ScriptListType;
      to: ScriptListType;
    }[];
  }
>;

/**
 * Scripts in which option `brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra`
 * is to be enabled
 */
export const SCRIPTS_TO_REPLACE_WITH_ANUNASIK = ['Telugu', 'Kannada'];

export const PRESETS: Preset = {
  none: {
    label: 'None',
    description: 'No Default Transliteration Options',
    direct_apply_rules: [],
    conditional_rules: []
  },
  tsc_portal: {
    label: 'The Sanskrit Channel',
    description: 'Default Transliteration Options used in The Sanskrit Channel Projects Portal',
    direct_apply_rules: [
      'all_to_normal:remove_virAma_and_double_virAma',
      'all_to_normal:replace_avagraha_with_a',
      'all_to_normal:replace_pancham_varga_varna_with_n',
      'all_to_sinhala:use_conjunct_enabling_halant'
    ],
    conditional_rules: SCRIPTS_TO_REPLACE_WITH_ANUNASIK.map((script) => ({
      rule: 'brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra',
      from: 'Devanagari',
      to: script as ScriptListType
    }))
  }
};
