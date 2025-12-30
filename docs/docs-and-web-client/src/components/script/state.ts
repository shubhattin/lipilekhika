import { atom } from 'nanostores';
import type { ScriptListType } from 'lipilekhika';

/** Shared state for input text
 *
 * Used for both `HomePageTyping` and `MainApp` components.
 */
export const input_text_atom = atom('');

const DEFAULT_FROM: ScriptListType = 'Devanagari';
/**
 * Shared state for typing script
 */
export const typing_script_atom = atom<ScriptListType>(DEFAULT_FROM);
