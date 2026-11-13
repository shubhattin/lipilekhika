//! The searchable script picker, grouped like the web app's: Modern, Latin and Ancient scripts,
//! each with its letter, name and a hint.

use crate::data::{
  SCRIPT_ORDER, ScriptCategory, get_script_avatar, script_font_family, script_hint, script_matches,
};
use gpui_kit::component::select::{SearchableVec, SelectGroup, SelectItem, SelectState};
use gpui_kit::component::{ActiveTheme as _, IndexPath, h_flex, v_flex};
use gpui_kit::{
  AnyElement, App, AppContext as _, Context, Entity, IntoElement, ParentElement as _, SharedString,
  Styled as _, Window, div, px,
};
use lipilekhika::ScriptListEnum;

#[derive(Debug, Clone)]
pub struct ScriptItem {
  pub script: ScriptListEnum,
  title: SharedString,
}

impl ScriptItem {
  fn new(script: ScriptListEnum) -> Self {
    Self {
      script,
      title: script.as_ref().to_string().into(),
    }
  }
}

/// The script's letter in a small rounded square
pub fn script_avatar(script: ScriptListEnum, size: f32, cx: &App) -> impl IntoElement + use<> {
  let mut el = div()
    .flex()
    .flex_none()
    .items_center()
    .justify_center()
    .size(px(size))
    .rounded(px(size * 0.28))
    .bg(cx.theme().secondary)
    .text_color(cx.theme().secondary_foreground)
    .text_size(px(size * 0.55))
    .child(get_script_avatar(script));
  if let Some(font) = script_font_family(script) {
    el = el.font_family(font);
  }
  el
}

impl SelectItem for ScriptItem {
  type Value = ScriptListEnum;

  fn title(&self) -> SharedString {
    self.title.clone()
  }

  fn display_title(&self) -> Option<AnyElement> {
    let mut glyph = div()
      .w(px(20.))
      .flex()
      .justify_center()
      .opacity(0.8)
      .child(get_script_avatar(self.script));
    if let Some(font) = script_font_family(self.script) {
      glyph = glyph.font_family(font);
    }
    Some(
      h_flex()
        .gap_2()
        .items_center()
        .child(glyph)
        .child(self.title.clone())
        .into_any_element(),
    )
  }

  fn render(&self, _: &mut Window, cx: &mut App) -> impl IntoElement {
    let hint = script_hint(self.script);
    h_flex()
      .gap_2p5()
      .items_center()
      .child(script_avatar(self.script, 26., cx))
      .child(
        v_flex()
          .gap_0()
          .child(div().text_sm().child(self.title.clone()))
          .when_some(hint, |el, hint| {
            el.child(
              div()
                .text_xs()
                .text_color(cx.theme().muted_foreground)
                .child(hint),
            )
          }),
      )
  }

  fn value(&self) -> &Self::Value {
    &self.script
  }

  fn matches(&self, query: &str) -> bool {
    script_matches(self.script, query)
  }
}

pub type ScriptSelectState = SelectState<SearchableVec<SelectGroup<ScriptItem>>>;

fn grouped_scripts(
  with_normal: bool,
) -> (SearchableVec<SelectGroup<ScriptItem>>, Vec<ScriptListEnum>) {
  let mut groups = SearchableVec::new(vec![]);
  let mut order = vec![];
  for category in ScriptCategory::ALL {
    let scripts: Vec<ScriptItem> = SCRIPT_ORDER
      .iter()
      .filter(|(s, c)| *c == category && (with_normal || *s != ScriptListEnum::Normal))
      .map(|(s, _)| {
        order.push(*s);
        ScriptItem::new(*s)
      })
      .collect();
    groups.push(SelectGroup::new(category.title()).items(scripts));
  }
  (groups, order)
}

/// The index path of the script in the grouped list
fn index_of(script: ScriptListEnum, with_normal: bool) -> Option<IndexPath> {
  let mut section = 0;
  for category in ScriptCategory::ALL {
    let scripts: Vec<ScriptListEnum> = SCRIPT_ORDER
      .iter()
      .filter(|(s, c)| *c == category && (with_normal || *s != ScriptListEnum::Normal))
      .map(|(s, _)| *s)
      .collect();
    if let Some(row) = scripts.iter().position(|s| *s == script) {
      return Some(IndexPath::default().section(section).row(row));
    }
    section += 1;
  }
  None
}

/// A searchable script select state, with `Normal` only when `with_normal`
pub fn new_script_select<T: 'static>(
  selected: ScriptListEnum,
  with_normal: bool,
  window: &mut Window,
  cx: &mut Context<T>,
) -> Entity<ScriptSelectState> {
  let (groups, _) = grouped_scripts(with_normal);
  let index = index_of(selected, with_normal);
  cx.new(|cx| SelectState::new(groups, index, window, cx).searchable(true))
}

/// Selects `script` in the select (no event)
pub fn set_script_select(
  state: &Entity<ScriptSelectState>,
  script: ScriptListEnum,
  window: &mut Window,
  cx: &mut App,
) {
  state.update(cx, |state, cx| {
    if state.selected_value() != Some(&script) {
      state.set_selected_value(&script, window, cx);
    }
  });
}

use gpui_kit::prelude::FluentBuilder as _;
