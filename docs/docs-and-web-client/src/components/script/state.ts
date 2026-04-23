import { atom } from 'nanostores';
import type { ScriptListType } from 'lipilekhika';
import { PRESETS, type PresetListType } from '~/tools/presets';
import { DEFAULT_USE_NATIVE_NUMERALS, DEFAULT_INCLUDE_INHERENT_VOWEL } from 'lipilekhika/typing';

const isPreset = (value: string): value is PresetListType => value in PRESETS;

const LOCAL_STORAGE_KEYS = {
  TYPING_SCRIPT: 'lipilekhika-app-typing-script',
  CURRENT_PRESET: 'lipilekhika-app-current-preset',
  USE_NATIVE_NUMERALS: 'lipilekhika-app-use-native-numerals',
  INCLUDE_INHERENT_VOWEL: 'lipilekhika-app-include-inherent-vowel'
} as const;

/** Shared state for input text
 *
 * Used for both `HomePageTyping` and `MainApp` components.
 */
export const input_text_atom = atom('');

const DEFAULT_FROM: ScriptListType = 'Devanagari';
/**
 * Shared state for typing script
 */
export const typing_script_atom = atom<ScriptListType>(
  (() => {
    if (typeof window === 'undefined') return DEFAULT_FROM;
    const localStorageValue = localStorage.getItem(LOCAL_STORAGE_KEYS.TYPING_SCRIPT);
    return localStorageValue ? (localStorageValue as ScriptListType) : DEFAULT_FROM;
  })()
);
typing_script_atom.subscribe((value) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KEYS.TYPING_SCRIPT, value);
});

const DEFAULT_PRESET: PresetListType = 'none';
/**
 * Shared state for current preset
 */
export const current_preset_atom = atom<PresetListType>(
  (() => {
    if (typeof window === 'undefined') return DEFAULT_PRESET;
    const localStorageValue = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_PRESET);
    return localStorageValue && isPreset(localStorageValue) ? localStorageValue : DEFAULT_PRESET;
  })()
);
current_preset_atom.subscribe((value) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_PRESET, value);
});

export const use_native_numerals_atom = atom<boolean>(
  (() => {
    if (typeof window === 'undefined') return DEFAULT_USE_NATIVE_NUMERALS;
    const localStorageValue = localStorage.getItem(LOCAL_STORAGE_KEYS.USE_NATIVE_NUMERALS);
    return localStorageValue ? Boolean(localStorageValue) : DEFAULT_USE_NATIVE_NUMERALS;
  })()
);
use_native_numerals_atom.subscribe((value) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KEYS.USE_NATIVE_NUMERALS, value.toString());
});

export const include_inherent_vowel_atom = atom<boolean>(
  (() => {
    if (typeof window === 'undefined') return DEFAULT_INCLUDE_INHERENT_VOWEL;
    const localStorageValue = localStorage.getItem(LOCAL_STORAGE_KEYS.INCLUDE_INHERENT_VOWEL);
    return localStorageValue ? Boolean(localStorageValue) : DEFAULT_INCLUDE_INHERENT_VOWEL;
  })()
);
include_inherent_vowel_atom.subscribe((value) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KEYS.INCLUDE_INHERENT_VOWEL, value.toString());
});
