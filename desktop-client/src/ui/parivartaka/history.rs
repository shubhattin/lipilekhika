//! Undo/redo for the source box, a port of the web app's `app/text_history.ts`. With realtime
//! typing every key is turned into the script's letters in code, so the history is kept here
//! (the same with typing on or off).
//!
//! Steps are grouped like an editor's: a run of typing or of deleting is one step, which ends at
//! a space or punctuation, after a pause, or when switching between typing and deleting. A
//! paste, a cut, a line break, Clear or an opened file is a step of its own.

use std::time::{Duration, Instant};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TextSnapshot {
  pub text: String,
  /// selection, UTF-8 byte offsets
  pub start: usize,
  pub end: usize,
}

/// What an edit was, for grouping
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EditKind {
  Type,
  Delete,
  Other,
}

/// A pause this long ends a step
const GROUP_PAUSE: Duration = Duration::from_millis(1000);
const MAX_STEPS: usize = 100;
/// Snapshots are whole copies of the text: past this many bytes in all, old steps go
const MAX_TOTAL_BYTES: usize = 5_000_000;

/// Typed text after which a word is done (it stays in the step, the next key starts one)
fn is_word_end(c: char) -> bool {
  c.is_whitespace() || ".,;:!?।॥()[]{}\"'“”‘’-".contains(c)
}

#[derive(Default)]
pub struct TextHistory {
  undo_stack: Vec<TextSnapshot>,
  redo_stack: Vec<TextSnapshot>,
  /// the kind of the step being extended, `None` when the next edit starts a new step
  open_kind: Option<EditKind>,
  last_edit: Option<Instant>,
}

impl TextHistory {
  /// Call just before an edit, with the box as it is then. `typed` is the text the edit inserts
  /// (for word ends), if any.
  pub fn record(&mut self, before: &TextSnapshot, kind: EditKind, typed: Option<&str>) {
    let now = Instant::now();
    let extends_step = kind != EditKind::Other
      && Some(kind) == self.open_kind
      && self
        .last_edit
        .is_some_and(|t| now.duration_since(t) < GROUP_PAUSE);
    if !extends_step && self.undo_stack.last().map(|s| &s.text) != Some(&before.text) {
      // (nothing changed since the last step began: an edit that didn't happen)
      self.push(before.clone());
    }
    self.redo_stack.clear();
    self.last_edit = Some(now);
    self.open_kind = if kind == EditKind::Other || typed.is_some_and(|t| t.chars().any(is_word_end))
    {
      None
    } else {
      Some(kind)
    };
  }

  /// The state to go back to, or `None`. `current` is kept for redo.
  pub fn undo(&mut self, current: TextSnapshot) -> Option<TextSnapshot> {
    self.open_kind = None;
    // skip steps that are the text as it is now (a recorded edit that changed nothing)
    let mut prev = self.undo_stack.pop();
    while prev.as_ref().is_some_and(|p| p.text == current.text) {
      prev = self.undo_stack.pop();
    }
    let prev = prev?;
    self.redo_stack.push(current);
    Some(prev)
  }

  /// The state to go forward to, or `None`. `current` is kept for undo.
  pub fn redo(&mut self, current: TextSnapshot) -> Option<TextSnapshot> {
    self.open_kind = None;
    let next = self.redo_stack.pop()?;
    self.undo_stack.push(current);
    Some(next)
  }

  /// Forget everything (the text now means something else, e.g. after a swap)
  pub fn clear(&mut self) {
    *self = Self::default();
  }

  fn push(&mut self, snapshot: TextSnapshot) {
    self.undo_stack.push(snapshot);
    let mut total: usize = self.undo_stack.iter().map(|s| s.text.len()).sum();
    while self.undo_stack.len() > 1
      && (self.undo_stack.len() > MAX_STEPS || total > MAX_TOTAL_BYTES)
    {
      total -= self.undo_stack.remove(0).text.len();
    }
  }
}

/// What changed between two texts: (start byte, removed text, inserted text)
pub fn text_change<'a>(old: &'a str, new: &'a str) -> (usize, &'a str, &'a str) {
  let mut prefix = old
    .bytes()
    .zip(new.bytes())
    .take_while(|(a, b)| a == b)
    .count();
  while !old.is_char_boundary(prefix) || !new.is_char_boundary(prefix) {
    prefix -= 1;
  }
  let max_suffix = old.len().min(new.len()) - prefix;
  let mut suffix = old
    .bytes()
    .rev()
    .zip(new.bytes().rev())
    .take(max_suffix)
    .take_while(|(a, b)| a == b)
    .count();
  while !old.is_char_boundary(old.len() - suffix) || !new.is_char_boundary(new.len() - suffix) {
    suffix -= 1;
  }
  (
    prefix,
    &old[prefix..old.len() - suffix],
    &new[prefix..new.len() - suffix],
  )
}

/// The kind of an edit the text box made by itself (typing off, deleting, pasting...)
pub fn edit_kind_of(old: &str, new: &str) -> (EditKind, Option<String>) {
  let (_, removed, inserted) = text_change(old, new);
  if removed.is_empty()
    && !inserted.is_empty()
    && inserted.chars().count() <= 2
    && !inserted.contains('\n')
  {
    (EditKind::Type, Some(inserted.to_string()))
  } else if inserted.is_empty() && !removed.is_empty() && !removed.contains('\n') {
    (EditKind::Delete, None)
  } else {
    (EditKind::Other, None)
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  fn snap(text: &str) -> TextSnapshot {
    TextSnapshot {
      text: text.into(),
      start: text.len(),
      end: text.len(),
    }
  }

  #[test]
  fn groups_a_word() {
    let mut h = TextHistory::default();
    h.record(&snap(""), EditKind::Type, Some("a"));
    h.record(&snap("a"), EditKind::Type, Some("b"));
    h.record(&snap("ab"), EditKind::Type, Some(" "));
    h.record(&snap("ab "), EditKind::Type, Some("c"));
    assert_eq!(h.undo(snap("ab c")).unwrap().text, "ab ");
    assert_eq!(h.undo(snap("ab ")).unwrap().text, "");
    assert_eq!(h.redo(snap("")).unwrap().text, "ab ");
  }

  #[test]
  fn change_detection() {
    assert_eq!(text_change("abc", "abXc"), (2, "", "X"));
    assert_eq!(text_change("कम", "कमल"), ("कम".len(), "", "ल"));
    assert_eq!(edit_kind_of("ab", "a").0, EditKind::Delete);
    assert_eq!(edit_kind_of("a", "a long paste").0, EditKind::Other);
  }
}
