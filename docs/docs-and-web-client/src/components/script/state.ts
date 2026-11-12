import { atom } from 'nanostores';
import { SCRIPT_LIST, type ScriptListType } from 'lipilekhika';
import { PRESETS, type PresetListType } from '~/tools/presets';
import { DEFAULT_USE_NATIVE_NUMERALS, DEFAULT_INCLUDE_INHERENT_VOWEL } from 'lipilekhika/typing';

/** Own keys only — `'constructor' in PRESETS` would otherwise pass. */
const isPreset = (value: string): value is PresetListType => Object.hasOwn(PRESETS, value);

const isScript = (value: string): value is ScriptListType =>
  (SCRIPT_LIST as string[]).includes(value);

/** `localStorage` can be missing or throw (SSR, private mode, blocked site data). */
const readStorage = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable or full: the value just won't persist
  }
};

/** `Boolean("false")` is true — parse stored booleans explicitly. */
const parseStoredBoolean = (value: string | null, defaultValue: boolean): boolean => {
  if (value === null) return defaultValue;
  return value === 'true';
};

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
    const localStorageValue = readStorage(LOCAL_STORAGE_KEYS.TYPING_SCRIPT);
    return localStorageValue && isScript(localStorageValue) ? localStorageValue : DEFAULT_FROM;
  })()
);
typing_script_atom.subscribe((value) => {
  writeStorage(LOCAL_STORAGE_KEYS.TYPING_SCRIPT, value);
});

const DEFAULT_PRESET: PresetListType = 'none';
/**
 * Shared state for current preset
 */
export const current_preset_atom = atom<PresetListType>(
  (() => {
    const localStorageValue = readStorage(LOCAL_STORAGE_KEYS.CURRENT_PRESET);
    return localStorageValue && isPreset(localStorageValue) ? localStorageValue : DEFAULT_PRESET;
  })()
);
current_preset_atom.subscribe((value) => {
  writeStorage(LOCAL_STORAGE_KEYS.CURRENT_PRESET, value);
});

export const use_native_numerals_atom = atom<boolean>(
  (() => {
    const localStorageValue = readStorage(LOCAL_STORAGE_KEYS.USE_NATIVE_NUMERALS);
    return parseStoredBoolean(localStorageValue, DEFAULT_USE_NATIVE_NUMERALS);
  })()
);
use_native_numerals_atom.subscribe((value) => {
  writeStorage(LOCAL_STORAGE_KEYS.USE_NATIVE_NUMERALS, value.toString());
});

export const include_inherent_vowel_atom = atom<boolean>(
  (() => {
    const localStorageValue = readStorage(LOCAL_STORAGE_KEYS.INCLUDE_INHERENT_VOWEL);
    return parseStoredBoolean(localStorageValue, DEFAULT_INCLUDE_INHERENT_VOWEL);
  })()
);
include_inherent_vowel_atom.subscribe((value) => {
  writeStorage(LOCAL_STORAGE_KEYS.INCLUDE_INHERENT_VOWEL, value.toString());
});
