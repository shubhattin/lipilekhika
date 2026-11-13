/**
 * The `/app` source text, kept in this browser's `localStorage` so a reload, a closed tab
 * or a phone discarding the tab in the background doesn't lose it.
 */

const STORAGE_KEY = 'lipilekhika-app-source-text';
/** `'0'` when the user turned "Remember text" off; missing means on (the default) */
const REMEMBER_KEY = 'lipilekhika-app-remember-text';

/** Longer text isn't kept: browsers allow about 5 MB per site, shared with everything else. */
export const MAX_SAVED_TEXT_CHARS = 500_000;

export type SaveResult = 'saved' | 'too_large' | 'unavailable';

/** `localStorage` can be missing or throw (private mode, blocked site data). */
export const loadSavedText = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

/** Removes the saved copy (also when "Remember text" is turned off) */
export const removeSavedText = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to do
  }
};

const isQuotaError = (err: unknown) =>
  err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22);

/**
 * Keeps `text` (an empty text removes the saved copy). When it can't be kept because it is
 * too long, an older saved copy is removed too, so a later visit doesn't bring back stale text.
 */
export const saveText = (text: string): SaveResult => {
  if (text.length > MAX_SAVED_TEXT_CHARS) {
    removeSavedText();
    return 'too_large';
  }
  try {
    if (text) localStorage.setItem(STORAGE_KEY, text);
    else localStorage.removeItem(STORAGE_KEY);
    return 'saved';
  } catch (err) {
    if (!isQuotaError(err)) return 'unavailable';
    removeSavedText();
    return 'too_large';
  }
};

/** Whether the text is kept for the next visit ("Remember text", on unless turned off) */
export const loadRememberText = (): boolean => {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== '0';
  } catch {
    return true;
  }
};

export const saveRememberText = (on: boolean) => {
  try {
    if (on) localStorage.removeItem(REMEMBER_KEY);
    else localStorage.setItem(REMEMBER_KEY, '0');
  } catch {
    // nothing to do: it stays on for the next visit
  }
};
