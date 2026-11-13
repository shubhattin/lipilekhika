//! Lipi Parivartaka: transliterate text between scripts, with realtime typing in the source box,
//! the same as the web app's `/app` page (`MainApp.svelte`).

mod history;
mod live_typing;
mod settings;

use super::about::AboutOf;
use super::option_examples::{TypingOptionExamples, typing_option_examples};
use super::script_select::{ScriptSelectState, new_script_select, set_script_select};
use super::styles::{AMBER, EMERALD, GREEN, SKY, kbd};
use super::title_bar::{CUSTOM_TITLE_BAR, Control, title_bar};
use super::{Controller, HelpTab};
use crate::data::script_font_family;
use crate::persistent_state::ThemePreference;
use gpui_kit::component::button::{Button, ButtonVariants as _};
use gpui_kit::component::input::{InputEvent, Redo, Textarea, TextareaState, Undo};
use gpui_kit::component::menu::{DropdownMenu as _, PopupMenuItem};
use gpui_kit::component::popover::Popover;
use gpui_kit::component::select::{Select, SelectEvent};
use gpui_kit::component::switch::Switch;
use gpui_kit::component::{
  ActiveTheme as _, Disableable as _, Icon, IconName, Selectable as _, Sizable as _,
  WindowExt as _, h_flex, v_flex,
};
use gpui_kit::prelude::FluentBuilder as _;
use gpui_kit::{
  Anchor, AnyElement, App, AppContext as _, ClipboardItem, Context, Entity, ExternalPaths,
  Focusable as _, InteractiveElement as _, IntoElement, KeyDownEvent, ParentElement as _,
  PathPromptOptions, Render, SharedString, StatefulInteractiveElement as _, Styled as _,
  Subscription, Task, Window, div, img, px,
};
use history::{EditKind, TextHistory, TextSnapshot, edit_kind_of};
use lipilekhika::{CustomOptions, Script, ScriptListEnum, get_all_options, transliterate};
use live_typing::LiveTyping;
use settings::{ParivartakaSettings, Preset, option_description, read_text_file, text_file_name};
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::time::Duration;

pub fn init(_cx: &mut App) {}

/// The source text is saved this long after typing stops
const SAVE_DELAY: Duration = Duration::from_millis(500);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ReplacedBy {
  Clear,
  Open,
}

/// The text that Clear or an opened file replaced, so a slip can be taken back. It stays on
/// offer until the box changes again.
struct Replaced {
  by: ReplacedBy,
  after: String,
}

pub struct Parivartaka {
  settings: ParivartakaSettings,
  from_select: Entity<ScriptSelectState>,
  to_select: Entity<ScriptSelectState>,
  source: Entity<TextareaState>,
  output: Entity<TextareaState>,
  live: LiveTyping,
  history: TextHistory,
  /// the source box as it was after the last change seen
  last: TextSnapshot,
  output_text: String,
  /// the options of the current pair of scripts, with their values
  options: Vec<(String, bool)>,
  options_open: bool,
  /// set when the user toggles an option by hand: the preset drops to None but the options
  /// stay as they are
  keep_options: bool,
  replaced: Option<Replaced>,
  /// the text brought back on start, for the note under the box until it is edited
  restored: Option<String>,
  file_error: Option<(String, Task<()>)>,
  file_drag_over: bool,
  copied: Option<(bool, Task<()>)>,
  save_task: Option<Task<()>>,
  examples: TypingOptionExamples,
  _subscriptions: Vec<Subscription>,
}

fn script_of(script: ScriptListEnum) -> Script {
  Script::from_str(script.as_ref()).unwrap_or(Script::Devanagari)
}

fn snapshot_of(state: &TextareaState) -> TextSnapshot {
  let range = state.selected_range();
  TextSnapshot {
    text: state.value().to_string(),
    start: range.start,
    end: range.end,
  }
}

impl Parivartaka {
  pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
    let settings = ParivartakaSettings::load();
    let (from, to) = (settings.from_script(), settings.to_script());
    let from_select = new_script_select(from, true, window, cx);
    let to_select = new_script_select(to, true, window, cx);

    let restored = settings::load_saved_text();
    let source = cx.new(|cx| {
      TextareaState::new(window, cx)
        .placeholder(Self::placeholder(&settings))
        .soft_wrap(true)
    });
    let output = cx.new(|cx| {
      TextareaState::new(window, cx)
        .placeholder("The transliteration appears here")
        .soft_wrap(true)
    });
    if let Some(text) = &restored {
      source.update(cx, |s, cx| s.set_value(text.clone(), window, cx));
    }

    let subscriptions = vec![
      cx.subscribe_in(
        &source,
        window,
        |this, _, event: &InputEvent, window, cx| match event {
          InputEvent::Change => this.on_source_changed(window, cx),
          InputEvent::Blur => this.live.clear(),
          _ => {}
        },
      ),
      cx.subscribe_in(&from_select, window, |this, _, event, window, cx| {
        if let SelectEvent::Confirm(Some(script)) = event {
          this.set_from(*script, window, cx);
        }
      }),
      cx.subscribe_in(&to_select, window, |this, _, event, window, cx| {
        if let SelectEvent::Confirm(Some(script)) = event {
          this.set_to(*script, window, cx);
        }
      }),
      cx.observe_window_appearance(window, |_, _, cx| super::on_system_appearance_changed(cx)),
      cx.observe_window_activation(window, |_, window, cx| {
        super::window_activation_changed(window, cx)
      }),
    ];

    let live = LiveTyping::new(
      from,
      settings.use_native_numerals,
      settings.include_inherent_vowel,
    );
    let last = snapshot_of(source.read(cx));
    let mut this = Self {
      examples: typing_option_examples(from),
      settings,
      from_select,
      to_select,
      source,
      output,
      live,
      history: TextHistory::default(),
      last,
      output_text: String::new(),
      options: vec![],
      options_open: false,
      keep_options: false,
      replaced: None,
      restored,
      file_error: None,
      file_drag_over: false,
      copied: None,
      save_task: None,
      _subscriptions: subscriptions,
    };
    this.apply_preset();
    this.convert(window, cx);
    this.source.update(cx, |s, cx| s.focus(window, cx));
    this
  }

  fn from(&self) -> ScriptListEnum {
    self.settings.from_script()
  }

  fn to(&self) -> ScriptListEnum {
    self.settings.to_script()
  }

  fn placeholder(settings: &ParivartakaSettings) -> String {
    let from = settings.from_script();
    if settings.typing_enabled && from != ScriptListEnum::Normal {
      format!("Type with English letters to write in {from}…")
    } else {
      "Enter text to transliterate…".to_string()
    }
  }

  fn save_settings(&self, cx: &App) {
    let settings = self.settings.clone();
    cx.background_executor()
      .spawn(async move { settings.save() })
      .detach();
  }

  // ---- Conversion ----

  /// The options of the current scripts, from the preset (or kept, after a manual change)
  fn apply_preset(&mut self) {
    let available = get_all_options(script_of(self.from()), script_of(self.to()));
    if std::mem::take(&mut self.keep_options) {
      let old = std::mem::take(&mut self.options);
      self.options = available
        .into_iter()
        .map(|o| {
          let on = old.iter().any(|(k, v)| *k == o && *v);
          (o, on)
        })
        .collect();
    } else {
      self.options = self
        .settings
        .preset
        .options(&available, self.from(), self.to());
    }
  }

  fn convert(&mut self, window: &mut Window, cx: &mut Context<Self>) {
    let options =
      CustomOptions::try_from_pairs(self.options.iter().map(|(k, v)| (k.as_str(), *v))).ok();
    let out = transliterate(
      &self.last.text,
      script_of(self.from()),
      script_of(self.to()),
      options.as_ref(),
    )
    .into_owned();
    if out != self.output_text {
      self.output_text = out.clone();
      self.output.update(cx, |s, cx| s.set_value(out, window, cx));
    }
    cx.notify();
  }

  fn after_text_change(&mut self, window: &mut Window, cx: &mut Context<Self>) {
    if self.restored.as_ref().is_some_and(|r| *r != self.last.text) {
      self.restored = None;
    }
    if self.settings.auto_convert {
      self.convert(window, cx);
    }
    self.schedule_save(cx);
    cx.notify();
  }

  // ---- The source box ----

  fn on_source_changed(&mut self, window: &mut Window, cx: &mut Context<Self>) {
    let now = snapshot_of(self.source.read(cx));
    if now.text == self.last.text {
      // our own edit (already recorded), or a change of nothing
      self.last = now;
      return;
    }
    // an edit the box made by itself: typing off, deleting, pasting, cutting...
    let (kind, typed) = edit_kind_of(&self.last.text, &now.text);
    self.history.record(&self.last, kind, typed.as_deref());
    self.live.clear();
    self.last = now;
    self.after_text_change(window, cx);
  }

  fn on_source_key_down(
    &mut self,
    event: &KeyDownEvent,
    window: &mut Window,
    cx: &mut Context<Self>,
  ) {
    let keystroke = &event.keystroke;
    let m = &keystroke.modifiers;
    let key = keystroke.key.to_lowercase();
    // Alt+X turns the typing on and off
    if m.alt && !m.control && !m.platform && key == "x" {
      self.set_typing_enabled(!self.settings.typing_enabled, cx);
      cx.stop_propagation();
      return;
    }
    // Ctrl/Cmd+S saves the box as .txt
    if (m.control || m.platform) && !m.alt && !m.shift && key == "s" {
      self.save_file(true, window, cx);
      cx.stop_propagation();
      return;
    }
    if !self.settings.typing_enabled || !self.live.is_active() {
      return;
    }
    if m.control || m.alt || m.platform || m.function {
      // these move the caret or edit the text: the next key starts afresh
      self.live.clear();
      return;
    }
    let Some(key_char) = keystroke.key_char.as_deref() else {
      // arrows, Home, Delete, Enter...
      self.live.clear();
      return;
    };
    let mut chars = key_char.chars();
    let (Some(ch), None) = (chars.next(), chars.next()) else {
      return;
    };
    if ch.is_control() {
      self.live.clear();
      return;
    }

    let before = snapshot_of(self.source.read(cx));
    let edit = self.live.key(
      &before.text,
      before.start.min(before.end)..before.start.max(before.end),
      ch,
    );
    self.history.record(&before, EditKind::Type, Some(key_char));
    let new_text = edit.apply(&before.text);
    self.last = TextSnapshot {
      text: new_text,
      start: edit.caret,
      end: edit.caret,
    };
    self.source.update(cx, |s, cx| {
      s.set_selected_range(edit.range.clone(), cx);
      s.replace(edit.text.clone(), window, cx);
    });
    cx.stop_propagation();
    self.after_text_change(window, cx);
  }

  fn apply_snapshot(
    &mut self,
    snapshot: TextSnapshot,
    window: &mut Window,
    cx: &mut Context<Self>,
  ) {
    self.live.clear();
    self.last = snapshot.clone();
    self.source.update(cx, |s, cx| {
      s.set_value(snapshot.text.clone(), window, cx);
      s.set_selected_range(snapshot.start..snapshot.end, cx);
      s.focus(window, cx);
    });
    self.after_text_change(window, cx);
  }

  fn undo(&mut self, window: &mut Window, cx: &mut Context<Self>) {
    let current = snapshot_of(self.source.read(cx));
    if let Some(prev) = self.history.undo(current) {
      self.apply_snapshot(prev, window, cx);
    }
  }

  fn redo(&mut self, window: &mut Window, cx: &mut Context<Self>) {
    let current = snapshot_of(self.source.read(cx));
    if let Some(next) = self.history.redo(current) {
      self.apply_snapshot(next, window, cx);
    }
  }

  /// A change made in code (Clear, an opened file): an undo step of its own
  fn set_input_text(&mut self, text: String, window: &mut Window, cx: &mut Context<Self>) {
    if text == self.last.text {
      return;
    }
    self.history.record(&self.last, EditKind::Other, None);
    let len = text.len();
    self.apply_snapshot(
      TextSnapshot {
        text,
        start: len,
        end: len,
      },
      window,
      cx,
    );
  }

  fn replace_input(
    &mut self,
    text: String,
    by: ReplacedBy,
    window: &mut Window,
    cx: &mut Context<Self>,
  ) {
    if !self.last.text.is_empty() && self.last.text != text {
      self.replaced = Some(Replaced {
        by,
        after: text.clone(),
      });
    }
    self.set_input_text(text, window, cx);
  }

  fn can_undo_replace(&self) -> bool {
    self
      .replaced
      .as_ref()
      .is_some_and(|r| r.after == self.last.text)
  }

  fn clear_input(&mut self, window: &mut Window, cx: &mut Context<Self>) {
    self.replace_input(String::new(), ReplacedBy::Clear, window, cx);
    // the saved copy goes now, not after the delay: Clear is how people remove it
    self.save_task = None;
    let _ = settings::save_text("");
  }

  fn schedule_save(&mut self, cx: &mut Context<Self>) {
    let text = self.last.text.clone();
    self.save_task = Some(cx.spawn(async move |_, cx| {
      cx.background_executor().timer(SAVE_DELAY).await;
      cx.background_executor()
        .spawn(async move {
          if let Err(err) = settings::save_text(&text) {
            eprintln!("Couldn't save the source text: {err}");
          }
        })
        .await;
    }));
  }

  // ---- Settings ----

  fn set_from(&mut self, script: ScriptListEnum, window: &mut Window, cx: &mut Context<Self>) {
    self.settings.from = script.to_string();
    self.live.set_script(script);
    self.examples = typing_option_examples(script);
    self.update_placeholder(window, cx);
    self.apply_preset();
    self.convert(window, cx);
    self.save_settings(cx);
  }

  fn set_to(&mut self, script: ScriptListEnum, window: &mut Window, cx: &mut Context<Self>) {
    self.settings.to = script.to_string();
    self.apply_preset();
    self.convert(window, cx);
    self.save_settings(cx);
  }

  fn update_placeholder(&mut self, window: &mut Window, cx: &mut Context<Self>) {
    let placeholder = Self::placeholder(&self.settings);
    self
      .source
      .update(cx, |s, cx| s.set_placeholder(placeholder, window, cx));
  }

  fn set_typing_enabled(&mut self, on: bool, cx: &mut Context<Self>) {
    self.settings.typing_enabled = on;
    self.live.clear();
    self.save_settings(cx);
    cx.notify();
  }

  fn set_native_numerals(&mut self, on: bool, cx: &mut Context<Self>) {
    self.settings.use_native_numerals = on;
    self.live.set_use_native_numerals(on);
    self.save_settings(cx);
    cx.notify();
  }

  fn set_inherent_vowel(&mut self, on: bool, cx: &mut Context<Self>) {
    self.settings.include_inherent_vowel = on;
    self.live.set_include_inherent_vowel(on);
    self.save_settings(cx);
    cx.notify();
  }

  fn set_preset(&mut self, preset: Preset, window: &mut Window, cx: &mut Context<Self>) {
    self.settings.preset = preset;
    self.keep_options = false;
    self.apply_preset();
    self.convert(window, cx);
    self.save_settings(cx);
  }

  fn set_option(&mut self, option: &str, on: bool, window: &mut Window, cx: &mut Context<Self>) {
    if let Some(entry) = self.options.iter_mut().find(|(k, _)| k == option) {
      entry.1 = on;
    }
    // a hand-toggled option no longer matches the preset
    if self.settings.preset != Preset::None {
      self.settings.preset = Preset::None;
      self.save_settings(cx);
    }
    self.convert(window, cx);
  }

  fn swap(&mut self, window: &mut Window, cx: &mut Context<Self>) {
    let (from, to) = (self.from(), self.to());
    self.settings.from = to.to_string();
    self.settings.to = from.to_string();
    set_script_select(&self.from_select, to, window, cx);
    set_script_select(&self.to_select, from, window, cx);
    self.live.set_script(to);
    self.examples = typing_option_examples(to);
    let (input, output) = (self.last.text.clone(), self.output_text.clone());
    // the old steps are text in the other script now; Swap again is the undo for a swap
    self.history.clear();
    self.replaced = None;
    let len = output.len();
    self.apply_snapshot(
      TextSnapshot {
        text: output,
        start: len,
        end: len,
      },
      window,
      cx,
    );
    self.apply_preset();
    self.output_text = input.clone();
    self
      .output
      .update(cx, |s, cx| s.set_value(input, window, cx));
    self.update_placeholder(window, cx);
    self.convert(window, cx);
    self.save_settings(cx);
  }

  // ---- Files and clipboard ----

  fn show_file_error(&mut self, message: String, cx: &mut Context<Self>) {
    let task = cx.spawn(async move |this, cx| {
      cx.background_executor().timer(Duration::from_secs(6)).await;
      let _ = this.update(cx, |this, cx| {
        this.file_error = None;
        cx.notify();
      });
    });
    self.file_error = Some((message, task));
    cx.notify();
  }

  fn open_path(&mut self, path: &Path, window: &mut Window, cx: &mut Context<Self>) {
    self.file_error = None;
    match read_text_file(path) {
      Ok(text) => self.replace_input(text, ReplacedBy::Open, window, cx),
      Err(err) => self.show_file_error(err, cx),
    }
  }

  fn pick_file(&mut self, window: &mut Window, cx: &mut Context<Self>) {
    let rx = cx.prompt_for_paths(PathPromptOptions {
      files: true,
      directories: false,
      multiple: false,
      prompt: Some("Open".into()),
    });
    cx.spawn_in(window, async move |this, cx| {
      let Ok(Ok(Some(paths))) = rx.await else {
        return;
      };
      let Some(path) = paths.into_iter().next() else {
        return;
      };
      let _ = this.update_in(cx, |this, window, cx| this.open_path(&path, window, cx));
    })
    .detach();
  }

  fn save_file(&mut self, source: bool, window: &mut Window, cx: &mut Context<Self>) {
    let (text, script) = if source {
      (self.last.text.clone(), self.from())
    } else {
      (self.output_text.clone(), self.to())
    };
    if text.is_empty() {
      return;
    }
    let dir = dirs::document_dir()
      .or_else(dirs::home_dir)
      .unwrap_or_else(|| PathBuf::from("."));
    let rx = cx.prompt_for_new_path(&dir, Some(&text_file_name(source, script)));
    cx.spawn_in(window, async move |_, cx| {
      let Ok(Ok(Some(path))) = rx.await else {
        return;
      };
      let result = std::fs::write(&path, text);
      let _ = cx.update(|window, cx| {
        let message = match result {
          Ok(()) => format!("Saved {}", path.display()),
          Err(err) => format!("Couldn't save {}: {err}", path.display()),
        };
        window.push_notification(message, cx);
      });
    })
    .detach();
  }

  fn copy(&mut self, source: bool, cx: &mut Context<Self>) {
    let text = if source {
      self.last.text.clone()
    } else {
      self.output_text.clone()
    };
    cx.write_to_clipboard(ClipboardItem::new_string(text));
    let task = cx.spawn(async move |this, cx| {
      cx.background_executor()
        .timer(Duration::from_millis(1500))
        .await;
      let _ = this.update(cx, |this, cx| {
        this.copied = None;
        cx.notify();
      });
    });
    self.copied = Some((source, task));
    cx.notify();
  }

  // ---- Rendering ----

  fn label(text: &'static str, cx: &App) -> impl IntoElement {
    div()
      .text_xs()
      .font_weight(gpui_kit::FontWeight::SEMIBOLD)
      .text_color(cx.theme().muted_foreground)
      .child(text)
  }

  fn copy_button(&self, source: bool, cx: &mut Context<Self>) -> impl IntoElement {
    let copied = self.copied.as_ref().is_some_and(|(s, _)| *s == source);
    let empty = if source {
      self.last.text.is_empty()
    } else {
      self.output_text.is_empty()
    };
    Button::new(if source { "copy-source" } else { "copy-output" })
      .ghost()
      .small()
      .disabled(empty)
      .icon(if copied {
        Icon::new(IconName::Check).text_color(GREEN.text(cx))
      } else {
        Icon::new(IconName::Copy).text_color(SKY.text(cx))
      })
      .tooltip(if source {
        "Copy source text"
      } else {
        "Copy output text"
      })
      .on_click(cx.listener(move |this, _, _, cx| this.copy(source, cx)))
  }

  fn save_button(&self, source: bool, cx: &mut Context<Self>) -> impl IntoElement {
    let empty = if source {
      self.last.text.is_empty()
    } else {
      self.output_text.is_empty()
    };
    let shortcut = if cfg!(target_os = "macos") {
      "⌘S"
    } else {
      "Ctrl+S"
    };
    Button::new(if source { "save-source" } else { "save-output" })
      .ghost()
      .small()
      .disabled(empty)
      .icon(Icon::new(gpui_kit::assets::IconName::Download).text_color(AMBER.text(cx)))
      .tooltip(SharedString::from(format!(
        "Save {} as .txt ({shortcut})",
        if source { "source" } else { "output" }
      )))
      .on_click(cx.listener(move |this, _, window, cx| this.save_file(source, window, cx)))
  }

  fn typing_settings(&self, cx: &mut Context<Self>) -> impl IntoElement {
    let font = script_font_family(self.from());
    let examples = self.examples.clone();
    let native = self.settings.use_native_numerals;
    let inherent = self.settings.include_inherent_vowel;
    let view = cx.entity();
    Popover::new("typing-options")
      .anchor(Anchor::TopRight)
      .trigger(
        Button::new("typing-options-btn")
          .ghost()
          .small()
          .icon(IconName::Settings)
          .tooltip("Typing options"),
      )
      .w(px(320.))
      .child({
        let theme = cx.theme();
        let row = |id: &'static str,
                   title: &'static str,
                   desc: &'static str,
                   example: Option<(String, String)>,
                   checked: bool,
                   on_change: fn(&mut Self, bool, &mut Context<Self>)| {
          let view = view.clone();
          h_flex()
            .gap_4()
            .items_center()
            .child(
              v_flex()
                .flex_1()
                .gap_1()
                .child(
                  div()
                    .text_sm()
                    .font_weight(gpui_kit::FontWeight::MEDIUM)
                    .child(title),
                )
                .child(
                  h_flex()
                    .flex_wrap()
                    .gap_1()
                    .text_xs()
                    .text_color(theme.muted_foreground)
                    .child(desc)
                    .when_some(example, |el, (input, output)| {
                      el.child(format!("({input} →"))
                        .child(
                          div()
                            .when_some(font, |el, f| el.font_family(f))
                            .child(output),
                        )
                        .child(")")
                    }),
                ),
            )
            .child(
              Switch::new(id)
                .checked(checked)
                .on_change(move |on, _, cx| {
                  view.update(cx, |this, cx| on_change(this, *on, cx));
                }),
            )
        };
        v_flex()
          .gap_3()
          .child(
            div()
              .font_weight(gpui_kit::FontWeight::MEDIUM)
              .child("Typing options"),
          )
          .child(row(
            "opt-native-numerals",
            "Use native numerals",
            "Convert numbers to script numerals",
            examples
              .numerals
              .as_ref()
              .map(|e| ("1".into(), e.on.clone())),
            native,
            Self::set_native_numerals,
          ))
          .child(div().h(px(1.)).bg(theme.border))
          .child(row(
            "opt-inherent-vowel",
            "Include inherent vowel",
            "Add the inherent vowel (schwa) to consonants",
            examples.vowel.as_ref().map(|e| ("k".into(), e.on.clone())),
            inherent,
            Self::set_inherent_vowel,
          ))
          .when(
            examples.vowel.is_some() || examples.numerals.is_some(),
            |el| {
              el.child(
                div()
                  .pt_3()
                  .border_t_1()
                  .border_color(theme.border)
                  .text_xs()
                  .text_color(theme.muted_foreground)
                  .child("Quick toggles for both sit at the bottom of the text box."),
              )
            },
          )
      })
  }

  /// The quick toggles of the typing options at the bottom of the source box
  fn option_chips(&self, cx: &mut Context<Self>) -> Vec<AnyElement> {
    if !self.settings.typing_enabled || self.from() == ScriptListEnum::Normal {
      return vec![];
    }
    let font = script_font_family(self.from());
    let mut chips = vec![];
    let chip = |id: &'static str,
                on: bool,
                input: &'static str,
                output: String,
                tip: &'static str,
                cx: &mut Context<Self>,
                toggle: fn(&mut Self, &mut Context<Self>)| {
      let theme = cx.theme();
      h_flex()
        .id(id)
        .gap_1()
        .items_center()
        .px_2()
        .h(px(24.))
        .rounded_full()
        .border_1()
        .cursor_pointer()
        .text_xs()
        .map(|el| {
          if on {
            el.border_color(theme.primary.opacity(0.4))
              .bg(theme.primary.opacity(0.12))
              .text_color(theme.foreground)
          } else {
            el.border_color(theme.border)
              .text_color(theme.muted_foreground)
              .hover(|s| s.bg(theme.accent))
          }
        })
        .tooltip(move |window, cx| {
          gpui_kit::component::tooltip::Tooltip::new(tip).build(window, cx)
        })
        .on_click(cx.listener(move |this, _, _, cx| toggle(this, cx)))
        .child(
          div()
            .font_family(theme.mono_font_family.clone())
            .child(input),
        )
        .child("→")
        .child(
          div()
            .text_sm()
            .when_some(font, |el, f| el.font_family(f))
            .child(output),
        )
        .into_any_element()
    };
    if let Some(e) = self.examples.vowel.clone() {
      let on = self.settings.include_inherent_vowel;
      chips.push(chip(
        "chip-vowel",
        on,
        "k",
        if on { e.on } else { e.off },
        "Inherent vowel (click to switch)",
        cx,
        |this, cx| this.set_inherent_vowel(!this.settings.include_inherent_vowel, cx),
      ));
    }
    if let Some(e) = self.examples.numerals.clone() {
      let on = self.settings.use_native_numerals;
      chips.push(chip(
        "chip-numerals",
        on,
        "1",
        if on { e.on } else { e.off },
        "Native numerals (click to switch)",
        cx,
        |this, cx| this.set_native_numerals(!this.settings.use_native_numerals, cx),
      ));
    }
    chips
  }

  fn source_section(&self, cx: &mut Context<Self>) -> impl IntoElement {
    let theme = cx.theme().clone();
    let from = self.from();
    let typing_on = self.settings.typing_enabled;
    let can_undo = self.can_undo_replace();
    let has_text = !self.last.text.is_empty();
    let font = script_font_family(from);
    v_flex()
      .flex_1()
      .min_w_0()
      .min_h_0()
      .gap_3()
      .child(
        v_flex().gap_2().child(Self::label("FROM", cx)).child(
          h_flex()
            .gap_2()
            .child(
              Select::new(&self.from_select)
                .w(px(250.))
                .menu_max_h(px(420.)),
            )
            .when(from != ScriptListEnum::Normal, |el| {
              el.child(
                Button::new("how-to-type")
                  .ghost()
                  .small()
                  .icon(Icon::new(gpui_kit::assets::IconName::Keyboard).text_color(SKY.text(cx)))
                  .label("How to type")
                  .on_click(move |_, window, cx| {
                    super::open_typing_help(from, HelpTab::Typing, Some(window), cx)
                  }),
              )
            }),
        ),
      )
      .child(
        h_flex()
          .items_center()
          .gap_1()
          .child(
            div()
              .mr_1()
              .text_sm()
              .font_weight(gpui_kit::FontWeight::MEDIUM)
              .text_color(theme.muted_foreground)
              .child("Source text"),
          )
          .child(self.copy_button(true, cx))
          .child(self.save_button(true, cx))
          .child(
            Button::new("open-file")
              .ghost()
              .small()
              .icon(Icon::new(IconName::FolderOpen).text_color(AMBER.text(cx)))
              .tooltip("Open a .txt file (or drop one on the box)")
              .on_click(cx.listener(|this, _, window, cx| this.pick_file(window, cx))),
          )
          .child(div().flex_1())
          .child(
            Button::new("typing-toggle")
              .small()
              .map(|b| if typing_on { b.primary() } else { b.outline() })
              .selected(typing_on)
              .icon(Icon::new(if typing_on {
                gpui_kit::assets::IconName::Keyboard
              } else {
                gpui_kit::assets::IconName::KeyboardOff
              }))
              .label("Typing")
              .tooltip(if typing_on {
                "Realtime typing is on: English keys type in the script. Click or Alt+X to turn off"
              } else {
                "Realtime typing is off: keys type as they are. Click or Alt+X to turn on"
              })
              .on_click(cx.listener(|this, _, window, cx| {
                this.set_typing_enabled(!this.settings.typing_enabled, cx);
                this.update_placeholder(window, cx);
              })),
          )
          .child(kbd("Alt+X", cx))
          .child(self.typing_settings(cx)),
      )
      .child(
        v_flex()
          .id("source-box")
          .key_context("SourceBox")
          .flex_1()
          .min_h(px(160.))
          .rounded(theme.radius)
          .border_1()
          .border_color(if self.file_drag_over {
            theme.primary
          } else {
            theme.input
          })
          .bg(theme.background)
          .capture_key_down(cx.listener(Self::on_source_key_down))
          .capture_action(cx.listener(|this, _: &Undo, window, cx| {
            this.undo(window, cx);
            cx.stop_propagation();
          }))
          .capture_action(cx.listener(|this, _: &Redo, window, cx| {
            this.redo(window, cx);
            cx.stop_propagation();
          }))
          .drag_over::<ExternalPaths>(|style, _, _, cx| {
            style
              .border_color(cx.theme().primary)
              .bg(cx.theme().primary.opacity(0.06))
          })
          .on_drop(cx.listener(|this, paths: &ExternalPaths, window, cx| {
            this.file_drag_over = false;
            if let Some(path) = paths.paths().first() {
              this.open_path(path, window, cx);
            }
          }))
          .child(
            div()
              .flex_1()
              .min_h_0()
              .text_size(px(17.))
              .when_some(font, |el, f| el.font_family(f))
              .child(
                Textarea::new(&self.source)
                  .large()
                  .bordered(false)
                  .h_full()
                  .aria_label("Source text"),
              ),
          )
          .child(
            h_flex()
              .min_h(px(36.))
              .items_center()
              .gap_2()
              .px_2()
              .pb_2()
              .children(self.option_chips(cx))
              .child(div().flex_1())
              .when(!has_text && !can_undo, |el| {
                el.child(
                  Button::new("open-file-strip")
                    .ghost()
                    .xsmall()
                    .icon(Icon::new(IconName::FolderOpen).text_color(AMBER.text(cx)))
                    .label("Open .txt")
                    .on_click(cx.listener(|this, _, window, cx| this.pick_file(window, cx))),
                )
              })
              .when_some(
                self.replaced.as_ref().filter(|_| can_undo),
                |el, replaced| {
                  el.child(
                    Button::new("undo-replace")
                      .ghost()
                      .xsmall()
                      .icon(IconName::Undo2)
                      .label(match replaced.by {
                        ReplacedBy::Clear => "Undo clear",
                        ReplacedBy::Open => "Undo open",
                      })
                      .on_click(cx.listener(|this, _, window, cx| {
                        this.replaced = None;
                        this.undo(window, cx);
                      })),
                  )
                },
              )
              .when(has_text, |el| {
                el.child(
                  Button::new("clear")
                    .ghost()
                    .xsmall()
                    .icon(Icon::new(gpui_kit::assets::IconName::X))
                    .label("Clear")
                    .tooltip("Clear the source text (and the copy kept by the app)")
                    .on_click(cx.listener(|this, _, window, cx| {
                      this.clear_input(window, cx);
                    })),
                )
              }),
          ),
      )
      .when_some(self.file_error.as_ref(), |el, (err, _)| {
        el.child(
          div()
            .px_1()
            .text_xs()
            .text_color(theme.danger)
            .child(err.clone()),
        )
      })
      .when(
        self.file_error.is_none() && self.restored.as_ref().is_some_and(|r| *r == self.last.text),
        |el| {
          el.child(
            div()
              .px_1()
              .text_xs()
              .text_color(theme.muted_foreground)
              .child("Restored from your last session. Clear removes it."),
          )
        },
      )
  }

  fn output_section(&self, cx: &mut Context<Self>) -> impl IntoElement {
    let theme = cx.theme().clone();
    let font = script_font_family(self.to());
    let auto = self.settings.auto_convert;
    v_flex()
      .flex_1()
      .min_w_0()
      .min_h_0()
      .gap_3()
      .child(
        v_flex().gap_2().child(Self::label("TO", cx)).child(
          Select::new(&self.to_select)
            .w(px(250.))
            .menu_max_h(px(420.)),
        ),
      )
      .child(
        h_flex()
          .items_center()
          .gap_1()
          .child(
            div()
              .mr_1()
              .text_sm()
              .font_weight(gpui_kit::FontWeight::MEDIUM)
              .text_color(theme.muted_foreground)
              .child("Output"),
          )
          .child(self.copy_button(false, cx))
          .child(self.save_button(false, cx))
          .child(div().flex_1())
          .when(!auto, |el| {
            el.child(
              Button::new("convert")
                .primary()
                .small()
                .icon(IconName::RefreshCw)
                .label("Convert")
                .on_click(cx.listener(|this, _, window, cx| this.convert(window, cx))),
            )
          })
          .child(
            Switch::new("auto-convert")
              .label("Auto convert")
              .small()
              .checked(auto)
              .on_change(cx.listener(|this, on: &bool, window, cx| {
                this.settings.auto_convert = *on;
                this.save_settings(cx);
                if *on {
                  this.convert(window, cx);
                }
                cx.notify();
              })),
          ),
      )
      .child(
        div()
          .id("output-box")
          .flex_1()
          .min_h(px(160.))
          .rounded(theme.radius)
          .border_1()
          .border_color(theme.input)
          .bg(theme.muted.opacity(0.35))
          .text_size(px(17.))
          .when_some(font, |el, f| el.font_family(f))
          .capture_key_down(cx.listener(|this, event: &KeyDownEvent, window, cx| {
            let m = &event.keystroke.modifiers;
            if (m.control || m.platform)
              && !m.alt
              && !m.shift
              && event.keystroke.key.eq_ignore_ascii_case("s")
            {
              this.save_file(false, window, cx);
              cx.stop_propagation();
            }
          }))
          .child(
            Textarea::new(&self.output)
              .large()
              .bordered(false)
              .readonly(true)
              .h_full()
              .aria_label("Output"),
          ),
      )
  }

  fn options_section(&self, cx: &mut Context<Self>) -> impl IntoElement {
    let theme = cx.theme().clone();
    let preset = self.settings.preset;
    let open = self.options_open;
    let enabled = self.options.iter().filter(|(_, on)| *on).count();
    v_flex()
      .rounded(theme.radius_lg)
      .border_1()
      .border_color(theme.border)
      .child(
        h_flex()
          .id("options-header")
          .items_center()
          .gap_3()
          .px_4()
          .py_2p5()
          .child(
            h_flex()
              .id("options-toggle")
              .flex_1()
              .gap_2()
              .items_center()
              .cursor_pointer()
              .on_click(cx.listener(|this, _, _, cx| {
                this.options_open = !this.options_open;
                cx.notify();
              }))
              .child(
                Icon::new(if open {
                  IconName::ChevronDown
                } else {
                  IconName::ChevronRight
                })
                .size(px(16.))
                .text_color(theme.muted_foreground),
              )
              .child(
                div()
                  .text_sm()
                  .font_weight(gpui_kit::FontWeight::MEDIUM)
                  .child("Transliteration options"),
              )
              .child(div().text_xs().text_color(theme.muted_foreground).child(
                if self.options.is_empty() {
                  "none for these scripts".to_string()
                } else {
                  format!("{enabled} of {} on", self.options.len())
                },
              )),
          )
          .child(
            div()
              .text_xs()
              .text_color(theme.muted_foreground)
              .child("Preset"),
          )
          .child(
            Button::new("preset")
              .outline()
              .small()
              .label(preset.label())
              .dropdown_caret(true)
              .dropdown_menu_with_anchor(Anchor::TopRight, {
                let view = cx.entity();
                move |menu, _, _| {
                  let mut menu = menu;
                  for p in Preset::ALL {
                    let view = view.clone();
                    menu = menu.item(PopupMenuItem::new(p.label()).checked(p == preset).on_click(
                      move |_, window, cx| {
                        view.update(cx, |this, cx| this.set_preset(p, window, cx));
                      },
                    ));
                  }
                  menu
                }
              }),
          ),
      )
      .when(open, |el| {
        el.child(
          v_flex()
            .gap_3()
            .px_4()
            .py_3()
            .border_t_1()
            .border_color(theme.border)
            .child(
              div()
                .text_xs()
                .text_color(theme.muted_foreground)
                .child(preset.description()),
            )
            .when(self.options.is_empty(), |el| {
              el.child(
                div()
                  .text_sm()
                  .text_color(theme.muted_foreground)
                  .child("No options available for this combination."),
              )
            })
            .children(self.options.iter().enumerate().map(|(ix, (option, on))| {
              let (name, desc) =
                option_description(option).unwrap_or(("", "No description available."));
              let name = if name.is_empty() {
                option.clone()
              } else {
                name.to_string()
              };
              let key = option.clone();
              h_flex()
                .gap_3()
                .items_center()
                .child(
                  Switch::new(SharedString::from(format!("option-{ix}")))
                    .checked(*on)
                    .small()
                    .on_change(cx.listener(move |this, on: &bool, window, cx| {
                      this.set_option(&key, *on, window, cx);
                    })),
                )
                .child(div().text_sm().child(name))
                .child(
                  Popover::new(SharedString::from(format!("option-info-{ix}")))
                    .anchor(Anchor::TopLeft)
                    .trigger(
                      Button::new(SharedString::from(format!("option-info-btn-{ix}")))
                        .ghost()
                        .xsmall()
                        .icon(IconName::Info),
                    )
                    .w(px(320.))
                    .child(div().text_sm().child(desc)),
                )
            })),
        )
      })
  }

  /// The theme menu
  fn theme_button(cx: &App) -> AnyElement {
    let theme_pref = Controller::global(cx).theme;
    Button::new("theme")
      .ghost()
      .small()
      .icon(match theme_pref {
        ThemePreference::System => Icon::new(gpui_kit::assets::IconName::SunMoon),
        ThemePreference::Light => Icon::new(IconName::Sun),
        ThemePreference::Dark => Icon::new(IconName::Moon),
      })
      .tooltip("Theme")
      .dropdown_menu_with_anchor(Anchor::TopRight, move |menu, _, _| {
        let item = |label: &'static str, pref: ThemePreference| {
          PopupMenuItem::new(label)
            .checked(theme_pref == pref)
            .on_click(move |_, _, cx| super::set_theme(pref, cx))
        };
        menu
          .item(item("System", ThemePreference::System))
          .item(item("Light", ThemePreference::Light))
          .item(item("Dark", ThemePreference::Dark))
      })
      .into_any_element()
  }

  /// The header where the system draws the title bar (macOS) or none (Linux)
  fn header(&self, cx: &mut Context<Self>) -> impl IntoElement {
    let theme = cx.theme().clone();
    h_flex()
      .items_center()
      .gap_3()
      .child(img(super::assets::app_icon()).size(px(30.)))
      .child(
        v_flex()
          .gap_0()
          .child(
            div()
              .text_lg()
              .font_weight(gpui_kit::FontWeight::SEMIBOLD)
              .child("Lipi Parivartaka"),
          )
          .child(
            div()
              .text_xs()
              .text_color(theme.muted_foreground)
              .child("Transliterate text between Indian scripts"),
          ),
      )
      .child(div().flex_1())
      .child(Self::theme_button(cx))
      .child(super::about::more_button(AboutOf::LipiParivartaka))
  }
}

impl Render for Parivartaka {
  fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
    let theme = cx.theme().clone();
    let wide = window.viewport_size().width >= px(900.);
    let swap = Button::new("swap")
      .outline()
      .rounded_full()
      .icon(Icon::new(gpui_kit::assets::IconName::ArrowLeftRight).text_color(EMERALD.text(cx)))
      .tooltip("Swap scripts and text")
      .on_click(cx.listener(|this, _, window, cx| this.swap(window, cx)));

    let columns = if wide {
      h_flex()
        .flex_1()
        .min_h_0()
        .items_stretch()
        .gap_4()
        .child(self.source_section(cx))
        .child(v_flex().pt(px(22.)).child(swap))
        .child(self.output_section(cx))
        .into_any_element()
    } else {
      v_flex()
        .flex_1()
        .min_h_0()
        .gap_4()
        .child(self.source_section(cx))
        .child(h_flex().justify_center().child(swap))
        .child(self.output_section(cx))
        .into_any_element()
    };

    let content = v_flex()
      .flex_1()
      .min_h_0()
      .px_6()
      .pt(if CUSTOM_TITLE_BAR { px(8.) } else { px(20.) })
      .pb_5()
      .gap_5()
      .when(!CUSTOM_TITLE_BAR, |el| el.child(self.header(cx)))
      .child(columns)
      .child(self.options_section(cx))
      .children(
        super::update::update_link(cx).map(|link| h_flex().mt(px(-8.)).justify_end().child(link)),
      );

    v_flex()
      .id("parivartaka")
      .size_full()
      .bg(theme.background)
      .text_color(theme.foreground)
      .on_drag_move::<ExternalPaths>(cx.listener(|this, _, _, cx| {
        if !this.file_drag_over {
          this.file_drag_over = true;
          cx.notify();
        }
      }))
      .when(CUSTOM_TITLE_BAR, |el| {
        el.child(title_bar(
          "Lipi Parivartaka",
          vec![
            Self::theme_button(cx),
            super::about::more_button(AboutOf::LipiParivartaka),
          ],
          &[Control::Maximize, Control::Close],
          window,
          cx,
        ))
      })
      .child(content)
      .when(false, |el| el.track_focus(&self.source.focus_handle(cx)))
  }
}
