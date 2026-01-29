import { atom } from 'nanostores';
import type { ScriptListType } from 'lipilekhika';
import type { PresetListType } from '~/tools/presets';

const LOCAL_STORAGE_KEYS = {
  TYPING_SCRIPT: 'lipilekhika-app-typing-script',
  CURRENT_PRESET: 'lipilekhika-app-current-preset'
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
    return localStorageValue ? (localStorageValue as PresetListType) : DEFAULT_PRESET;
  })()
);
current_preset_atom.subscribe((value) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_PRESET, value);
});
