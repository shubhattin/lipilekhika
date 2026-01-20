import type { TransliterationOptions } from "lipilekhika";

type CustomOptionList = keyof TransliterationOptions;

/**
 * Descriptions for transliteration options
 * Format: [display name, description]
 */
export const CUSTOM_OPTION_DESCRIPTIONS: Record<
  CustomOptionList,
  [name: string, description: string]
> = {
  "all_to_normal:preserve_specific_chars": [
    "Preserve Specific Characters",
    "Preserves script-specific characters when converting to Normal script. Can be useful for studying script specific characters.",
  ],
  "all_to_normal:remove_virAma_and_double_virAma": [
    "Remove Virāma and Double Virāma",
    "Removes virāma (।) and pūrṇa virāma (॥) punctuation from Normal/Romanized output.",
  ],
  "all_to_normal:replace_avagraha_with_a": [
    "Replace Avagraha with a",
    "Replaces avagraha (ऽ) with 'a' in Normal/Romanized output.",
  ],
  "all_to_sinhala:use_conjunct_enabling_halant": [
    "Use Conjunct Enabling Halant",
    "Uses conjunct-enabling halant (්‍) for Sinhala output to properly form conjunct consonants.",
  ],
  "all_to_normal:replace_pancham_varga_varna_with_n": [
    "Replace Pancham Varga Varna with n",
    "Replaces ङ (G) and ञ (J) with 'n' for more natural output.",
  ],
  "brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra": [
    "Replace Pancham Varga Varna with Anusvāra",
    "Replaces 5th varga consonants (ङ्, ञ्, ण्, न्, म्) with anusvāra (ं) when followed by consonants of the same varga.",
  ],
  "normal_to_all:use_typing_chars": [
    "Use Typing Characters",
    "Enables typing mode characters including duplicate alternatives and script-specific characters. Equivalent to typing mode using `createTypingContext` function.",
  ],
};
