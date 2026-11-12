/**
 * Undo/redo for the `/app` source box. With realtime typing on, every key is turned into the
 * script's letters in code (`setRangeText`), which the browser's own undo doesn't track, so
 * Ctrl+Z did nothing there. This keeps the history itself, the same with typing on or off.
 *
 * Steps are grouped like an editor's: a run of typing or of deleting is one step, which ends
 * at a space or punctuation, after a pause, or when switching between typing and deleting.
 * A paste, a cut, a line break, Clear or an opened file is a step of its own.
 */

export type TextSnapshot = { text: string; start: number; end: number };

/** What an edit was, for grouping */
export type EditKind = 'type' | 'delete' | 'other';

/** A pause this long ends a step */
const GROUP_PAUSE_MS = 1000;
const MAX_STEPS = 100;
/** Snapshots are whole copies of the text: past this many characters in all, old steps go */
const MAX_TOTAL_CHARS = 5_000_000;

/** Typed text after which a word is done (it stays in the step, the next key starts one) */
const WORD_END = /[\s.,;:!?।॥()[\]{}"'“”‘’-]/;

/** `beforeinput`'s `inputType` as an edit kind (`historyUndo`/`historyRedo` are handled apart) */
export const editKindOf = (input_type: string): EditKind => {
  if (input_type === 'insertText' || input_type === 'insertCompositionText') return 'type';
  if (input_type === 'deleteContentBackward' || input_type === 'deleteContentForward')
    return 'delete';
  return 'other';
};

export class TextHistory {
  private undo_stack: TextSnapshot[] = [];
  private redo_stack: TextSnapshot[] = [];
  /** the kind of the step being extended, `null` when the next edit starts a new step */
  private open_kind: EditKind | null = null;
  private last_edit = 0;

  /**
   * Call just before an edit, with the box as it is then. `typed` is the text the edit inserts
   * (for word ends), if any.
   */
  record(before: TextSnapshot, kind: EditKind, typed?: string | null) {
    const now = Date.now();
    const extends_step =
      kind !== 'other' && kind === this.open_kind && now - this.last_edit < GROUP_PAUSE_MS;
    if (!extends_step) {
      const top = this.undo_stack.at(-1);
      // nothing changed since the last step began (an edit that didn't happen)
      if (top?.text !== before.text) this.push(before);
    }
    this.redo_stack = [];
    this.last_edit = now;
    this.open_kind = kind === 'other' || (typed && WORD_END.test(typed)) ? null : kind;
  }

  /** The state to go back to, or `null`. `current` is kept for redo. */
  undo(current: TextSnapshot): TextSnapshot | null {
    this.open_kind = null;
    // skip steps that are the text as it is now (a recorded edit that changed nothing)
    let prev = this.undo_stack.pop();
    while (prev && prev.text === current.text) prev = this.undo_stack.pop();
    if (!prev) return null;
    this.redo_stack.push(current);
    return prev;
  }

  /** The state to go forward to, or `null`. `current` is kept for undo. */
  redo(current: TextSnapshot): TextSnapshot | null {
    this.open_kind = null;
    const next = this.redo_stack.pop();
    if (!next) return null;
    this.undo_stack.push(current);
    return next;
  }

  /** Forget everything (the text now means something else, e.g. after a swap) */
  clear() {
    this.undo_stack = [];
    this.redo_stack = [];
    this.open_kind = null;
  }

  private push(snapshot: TextSnapshot) {
    this.undo_stack.push(snapshot);
    let total = this.undo_stack.reduce((n, s) => n + s.text.length, 0);
    while (
      this.undo_stack.length > 1 &&
      (this.undo_stack.length > MAX_STEPS || total > MAX_TOTAL_CHARS)
    ) {
      total -= this.undo_stack.shift()!.text.length;
    }
  }
}
