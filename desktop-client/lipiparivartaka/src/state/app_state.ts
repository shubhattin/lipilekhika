import { writable } from "svelte/store";
import type { ScriptListType } from "lipilekhika";

const LOCAL_STORAGE_KEYS = {
  TYPING_SCRIPT: "lipilekhika-app-typing-script",
} as const;

/** Shared state for input text
 *
 * Used for both `HomePageTyping` and `MainApp` components.
 */
export const input_text_atom = writable("");

const DEFAULT_FROM: ScriptListType = "Devanagari";
/**
 * Shared state for typing script
 */
export const typing_script_atom = writable<ScriptListType>(
  (() => {
    if (typeof window === "undefined") return DEFAULT_FROM;
    const localStorageValue = localStorage.getItem(
      LOCAL_STORAGE_KEYS.TYPING_SCRIPT,
    );
    return localStorageValue
      ? (localStorageValue as ScriptListType)
      : DEFAULT_FROM;
  })(),
);
typing_script_atom.subscribe((value) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEYS.TYPING_SCRIPT, value);
});
