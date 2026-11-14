//! The typing help window, the same as the web app's `TypingHelper.svelte`: the typing map of a
//! script (each character with the keys that type it) and the comparison of two scripts.

mod layout;

use super::script_select::{ScriptSelectState, new_script_select, set_script_select};
use super::styles::{AMBER, EMERALD, FUCHSIA, ROSE, SKY, Tone, VIOLET, dot, kbd, kbd_alt};
use crate::data::script_font_family;
use gpui_kit::component::button::{Button, ButtonVariants as _};
use gpui_kit::component::checkbox::Checkbox;
use gpui_kit::component::popover::Popover;
use gpui_kit::component::select::{Select, SelectEvent};
use gpui_kit::component::{ActiveTheme as _, Icon, IconName, Sizable as _, h_flex, v_flex};
use gpui_kit::prelude::FluentBuilder as _;
use gpui_kit::{
  Anchor, AnyElement, App, Context, Entity, FocusHandle, Hsla, InteractiveElement as _,
  IntoElement, KeyDownEvent, ParentElement as _, Render, ScrollHandle, SharedString,
  StatefulInteractiveElement as _, Styled as _, Subscription, Window, div, px,
};
use layout::{Cell, Group, Layout, SectionId, TypingControls, display_text, is_invisible};
use lipilekhika::ScriptListEnum;

pub fn init(_cx: &mut App) {}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HelpTab {
  Typing,
  Compare,
}

pub struct TypingHelp {
  script: ScriptListEnum,
  compare: ScriptListEnum,
  tab: HelpTab,
  show_alternates: bool,
  layout: Layout,
  /// ई with its keys, for the "alternate keys" info
  alternates_example: Option<(String, Vec<String>)>,
  script_select: Entity<ScriptSelectState>,
  compare_select: Entity<ScriptSelectState>,
  scroll: ScrollHandle,
  /// the window's keys (Alt+X) reach the view through it
  focus: FocusHandle,
  _subscriptions: Vec<Subscription>,
}

/// each group is coloured by what it holds, like the charts of the old Lipi Lekhika
fn tone_of(section: SectionId, group: &str) -> Tone {
  match section {
    SectionId::Svara => SKY,
    SectionId::Vyanjana if group == "conjuncts" => EMERALD,
    SectionId::Vyanjana => ROSE,
    SectionId::Other if group == "numerals" => VIOLET,
    SectionId::Other => AMBER,
    SectionId::Special if group == "signs" => SKY,
    SectionId::Special => FUCHSIA,
  }
}

fn section_accent(section: SectionId) -> Tone {
  match section {
    SectionId::Svara => SKY,
    SectionId::Vyanjana => ROSE,
    SectionId::Other => AMBER,
    SectionId::Special => FUCHSIA,
  }
}

impl TypingHelp {
  pub fn new(
    script: ScriptListEnum,
    tab: HelpTab,
    window: &mut Window,
    cx: &mut Context<Self>,
  ) -> Self {
    let compare = ScriptListEnum::Romanized;
    let script_select = new_script_select(script, false, window, cx);
    let compare_select = new_script_select(compare, true, window, cx);
    let subscriptions = vec![
      cx.subscribe_in(&script_select, window, |this, _, event, _, cx| {
        if let SelectEvent::Confirm(Some(script)) = event {
          this.script = *script;
          this.rebuild();
          cx.notify();
        }
      }),
      cx.subscribe_in(&compare_select, window, |this, _, event, _, cx| {
        if let SelectEvent::Confirm(Some(script)) = event {
          this.compare = *script;
          this.rebuild();
          cx.notify();
        }
      }),
      cx.observe_window_appearance(window, |_, _, cx| super::on_system_appearance_changed(cx)),
      cx.observe_window_activation(window, |_, window, cx| {
        super::window_activation_changed(window, cx)
      }),
    ];
    let focus = cx.focus_handle();
    window.focus(&focus, cx);
    let mut this = Self {
      script,
      compare,
      tab,
      show_alternates: true,
      layout: layout::build_layout(script, None),
      alternates_example: None,
      script_select,
      compare_select,
      scroll: ScrollHandle::new(),
      focus,
      _subscriptions: subscriptions,
    };
    this.rebuild();
    this
  }

  /// Shows `script` on `tab` (the window was asked for again)
  pub fn show(
    &mut self,
    script: ScriptListEnum,
    tab: HelpTab,
    window: &mut Window,
    cx: &mut Context<Self>,
  ) {
    self.script = script;
    self.tab = tab;
    set_script_select(&self.script_select, script, window, cx);
    self.rebuild();
    cx.notify();
  }

  fn rebuild(&mut self) {
    let typing_layout = layout::build_layout(self.script, None);
    self.alternates_example = layout::alternates_example(&typing_layout);
    self.layout = match self.tab {
      HelpTab::Typing => typing_layout,
      HelpTab::Compare => layout::build_layout(self.script, Some(self.compare)),
    };
    self.scroll.set_offset(gpui_kit::point(px(0.), px(0.)));
  }

  fn set_tab(&mut self, tab: HelpTab, cx: &mut Context<Self>) {
    if self.tab != tab {
      self.tab = tab;
      self.rebuild();
      cx.notify();
    }
  }

  fn glyph(
    text: &str,
    label: Option<&'static str>,
    size: f32,
    color: Hsla,
    font: Option<&'static str>,
    cx: &App,
  ) -> AnyElement {
    if is_invisible(text) {
      return div()
        .text_xs()
        .font_weight(gpui_kit::FontWeight::SEMIBOLD)
        .text_color(cx.theme().muted_foreground)
        .child(label.unwrap_or("?"))
        .into_any_element();
    }
    div()
      .text_size(px(size))
      .line_height(px(size * 1.3))
      .text_color(color)
      .when_some(font, |el, f| el.font_family(f))
      .child(SharedString::from(display_text(text)))
      .into_any_element()
  }

  fn card(&self, cell: &Option<Cell>, tone: Tone, width: f32, cx: &App) -> AnyElement {
    let theme = cx.theme();
    let Some(cell) = cell else {
      return div()
        .w(px(width))
        .min_h(px(64.))
        .rounded(px(8.))
        .border_1()
        .border_dashed()
        .border_color(theme.border.opacity(0.6))
        .into_any_element();
    };
    let font = script_font_family(self.script);
    let other_font = script_font_family(self.compare);
    let glyph_color = tone.text(cx);
    let id = SharedString::from(format!("cell-{}", cell.id));
    let label = cell.label;
    let mut card = v_flex()
      .id(id)
      .w(px(width))
      .items_center()
      .gap_1()
      .px(px(6.))
      .py_2()
      .rounded(px(8.))
      .border_1()
      .border_color(tone.alpha(0.28))
      .bg(tone.alpha(0.06))
      .hover(|s| s.border_color(tone.alpha(0.55)).bg(tone.alpha(0.12)))
      .when_some(label, |el, label| {
        el.tooltip(move |window, cx| {
          gpui_kit::component::tooltip::Tooltip::new(label).build(window, cx)
        })
      })
      .child(
        h_flex()
          .gap_2()
          .items_baseline()
          .child(Self::glyph(
            &cell.main.text,
            cell.label,
            24.,
            glyph_color,
            font,
            cx,
          ))
          .when_some(cell.sign.as_ref(), |el, sign| {
            el.child(div().opacity(0.75).child(Self::glyph(
              &sign.text,
              None,
              24.,
              glyph_color,
              font,
              cx,
            )))
          }),
      );
    match self.tab {
      HelpTab::Typing => {
        if let Some(primary) = &cell.main.primary {
          card = card.child(kbd(primary.clone(), cx));
        }
        if self.show_alternates && !cell.main.alternates.is_empty() {
          card = card.child(
            h_flex().flex_wrap().justify_center().gap(px(2.)).children(
              cell
                .main
                .alternates
                .iter()
                .map(|alt| kbd_alt(alt.clone(), cx)),
            ),
          );
        }
      }
      HelpTab::Compare => {
        let other = cell.other.as_ref();
        let other_text = other
          .map(|o| o.text.as_str())
          .filter(|t| !t.is_empty())
          .unwrap_or("—");
        card = card
          .child(div().h(px(1.)).w(px(24.)).bg(theme.border))
          .child(
            h_flex()
              .gap_2()
              .items_baseline()
              .child(Self::glyph(
                other_text,
                None,
                20.,
                theme.muted_foreground,
                other_font,
                cx,
              ))
              .when_some(other.and_then(|o| o.sign.as_ref()), |el, sign| {
                el.child(Self::glyph(
                  sign,
                  None,
                  20.,
                  theme.muted_foreground,
                  other_font,
                  cx,
                ))
              }),
          );
        // the other spellings of the compared script (`R^i` beside `RRi` in ITRANS)
        if let Some(other) = other
          && self.show_alternates
          && !other.alternates.is_empty()
        {
          card = card.child(
            h_flex()
              .flex_wrap()
              .justify_center()
              .gap(px(2.))
              .children(other.alternates.iter().map(|alt| kbd_alt(alt.clone(), cx))),
          );
        }
      }
    }
    card.into_any_element()
  }

  fn group(
    &self,
    section: SectionId,
    section_title: &str,
    group: &Group,
    cx: &App,
  ) -> impl IntoElement {
    let theme = cx.theme();
    let tone = tone_of(section, group.id);
    let width = if group.columns.is_some() || group.id == "svara" {
      104.
    } else {
      84.
    };
    v_flex()
      .gap_1p5()
      .when(group.title != section_title, |el| {
        el.child(
          h_flex()
            .gap_2()
            .items_center()
            .child(div().w(px(4.)).h(px(12.)).rounded_full().bg(tone.base()))
            .child(
              div()
                .text_sm()
                .font_weight(gpui_kit::FontWeight::SEMIBOLD)
                .child(group.title),
            )
            .when_some(group.hint, |el, hint| {
              el.child(
                div()
                  .text_xs()
                  .text_color(theme.muted_foreground)
                  .child(hint),
              )
            }),
        )
      })
      .child(
        h_flex().flex_wrap().gap_2().items_stretch().children(
          group
            .cells
            .iter()
            .map(|cell| self.card(cell, tone, width, cx)),
        ),
      )
  }

  fn controls(&self, controls: &TypingControls, cx: &App) -> impl IntoElement {
    let theme = cx.theme();
    let font = script_font_family(self.script);
    let script_text = move |text: String| {
      div()
        .text_sm()
        .when_some(font, |el, f| el.font_family(f))
        .child(text)
    };
    let mut items: Vec<AnyElement> = vec![];
    if let Some(sep) = &controls.separator {
      items.push(
        h_flex()
          .gap_2p5()
          .items_start()
          .child(kbd("q", cx))
          .child(
            v_flex()
              .gap_0p5()
              .child(div().text_sm().child("Keeps two keys apart"))
              .child(
                h_flex()
                  .gap_1()
                  .items_center()
                  .text_xs()
                  .text_color(theme.muted_foreground)
                  .child(sep.split.clone())
                  .child("→")
                  .child(script_text(sep.split_text.clone()).text_color(theme.foreground))
                  .child(", not")
                  .child(sep.joined.clone())
                  .child("→")
                  .child(script_text(sep.joined_text.clone())),
              ),
          )
          .into_any_element(),
      );
    }
    for joiner in &controls.joiners {
      items.push(
        h_flex()
          .gap_2p5()
          .items_start()
          .child(kbd(joiner.key.clone(), cx))
          .child(
            v_flex()
              .gap_0p5()
              .child(div().text_sm().child(joiner.name))
              .when_some(joiner.example.clone(), |el, (input, output)| {
                el.child(
                  h_flex()
                    .gap_1()
                    .items_center()
                    .text_xs()
                    .text_color(theme.muted_foreground)
                    .child(input)
                    .child("→")
                    .child(script_text(output).text_color(theme.foreground)),
                )
              }),
          )
          .into_any_element(),
      );
    }
    v_flex()
      .mt_6()
      .gap_3()
      .p_4()
      .rounded(px(10.))
      .border_1()
      .border_color(theme.border)
      .bg(theme.muted.opacity(0.3))
      .child(
        h_flex()
          .gap_2()
          .items_baseline()
          .child(
            div()
              .text_sm()
              .font_weight(gpui_kit::FontWeight::SEMIBOLD)
              .child("Typing controls"),
          )
          .child(
            div()
              .text_xs()
              .text_color(theme.muted_foreground)
              .child("keys that change how you type"),
          ),
      )
      .when(!items.is_empty(), |el| {
        el.child(
          h_flex().flex_wrap().gap_x_8().gap_y_2().children(
            items
              .into_iter()
              .map(|item| div().min_w(px(300.)).child(item)),
          ),
        )
      })
      .when(!controls.literals.is_empty(), |el| {
        el.child(
          h_flex()
            .flex_wrap()
            .items_center()
            .gap_1p5()
            .pt_3()
            .border_t_1()
            .border_color(theme.border)
            .child(
              div()
                .mr_1()
                .text_xs()
                .text_color(theme.muted_foreground)
                .child("Literal letters"),
            )
            .children(controls.literals.iter().map(|(key, text)| {
              h_flex()
                .gap_1()
                .items_center()
                .px_1p5()
                .py_0p5()
                .rounded(px(6.))
                .border_1()
                .border_color(theme.border)
                .bg(theme.background)
                .text_xs()
                .child(
                  div()
                    .font_family(theme.mono_font_family.clone())
                    .font_weight(gpui_kit::FontWeight::SEMIBOLD)
                    .child(key.clone()),
                )
                .child(div().text_color(theme.muted_foreground).child("→"))
                .child(text.clone())
            })),
        )
      })
  }

  /// The Typing map / Compare switch, a segmented control like the web app's tabs
  fn tabs(&self, selected: usize, cx: &mut Context<Self>) -> impl IntoElement {
    let theme = cx.theme().clone();
    let tab = |ix: usize, icon: Icon, label: &'static str, cx: &mut Context<Self>| {
      let active = ix == selected;
      h_flex()
        .id(SharedString::from(format!("help-tab-{ix}")))
        .gap_1p5()
        .items_center()
        .px_3()
        .h(px(28.))
        .rounded(px(6.))
        .text_sm()
        .cursor_pointer()
        .map(|el| {
          if active {
            el.bg(theme.background)
              .text_color(theme.foreground)
              .font_weight(gpui_kit::FontWeight::MEDIUM)
              .shadow_xs()
          } else {
            el.text_color(theme.muted_foreground)
              .hover(|s| s.text_color(theme.foreground))
          }
        })
        .on_click(cx.listener(move |this, _, _, cx| {
          this.set_tab(
            if ix == 0 {
              HelpTab::Typing
            } else {
              HelpTab::Compare
            },
            cx,
          )
        }))
        .child(icon.size(px(14.)))
        .child(label)
    };
    h_flex()
      .p(px(3.))
      .gap_0p5()
      .rounded(px(8.))
      .bg(theme.muted)
      .child(tab(0, Icon::new(IconName::Map), "Typing map", cx))
      .child(tab(
        1,
        Icon::new(gpui_kit::assets::IconName::ArrowLeftRight),
        "Compare",
        cx,
      ))
  }

  fn alternates_info(&self, cx: &App) -> impl IntoElement {
    let font = script_font_family(self.script);
    let example = self.alternates_example.clone();
    Popover::new("alternates-info")
      .anchor(Anchor::TopRight)
      .trigger(
        Button::new("alternates-info-btn")
          .ghost()
          .xsmall()
          .icon(IconName::Info),
      )
      .w(px(300.))
      .child({
        let theme = cx.theme();
        v_flex()
          .gap_2p5()
          .text_sm()
          .child(div().font_weight(gpui_kit::FontWeight::SEMIBOLD).child("Alternate keys"))
          .child(
            div()
              .text_color(theme.muted_foreground)
              .child("Other keys for the same letter. The first one is the main key."),
          )
          .when_some(example, |el, (text, keys)| {
            el.child(
              h_flex()
                .gap_2()
                .items_center()
                .px_3()
                .py_2()
                .rounded(px(6.))
                .bg(theme.muted.opacity(0.6))
                .children(keys.into_iter().enumerate().flat_map(|(i, key)| {
                  let mut parts: Vec<AnyElement> = vec![];
                  if i == 1 {
                    parts.push(
                      div()
                        .text_xs()
                        .text_color(theme.muted_foreground)
                        .child("or")
                        .into_any_element(),
                    );
                  }
                  parts.push(if i == 0 {
                    kbd(key, cx).into_any_element()
                  } else {
                    kbd_alt(key, cx).into_any_element()
                  });
                  parts
                }))
                .child(div().text_color(theme.muted_foreground).child("→"))
                .child(
                  div()
                    .text_2xl()
                    .when_some(font, |el, f| el.font_family(f))
                    .child(text),
                ),
            )
          })
          .child(
            div()
              .text_xs()
              .text_color(theme.muted_foreground)
              .child("All of them work while typing. When converting text, some alternates need the Use Typing Characters option."),
          )
      })
  }
}

impl Render for TypingHelp {
  fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
    let theme = cx.theme().clone();
    let tab_index = match self.tab {
      HelpTab::Typing => 0,
      HelpTab::Compare => 1,
    };

    let header = h_flex()
      .items_center()
      .gap_2()
      .px_5()
      .py_3()
      .border_b_1()
      .border_color(theme.border)
      .child(
        Icon::new(gpui_kit::assets::IconName::Keyboard)
          .size(px(20.))
          .text_color(theme.primary),
      )
      .child(
        div()
          .text_lg()
          .font_weight(gpui_kit::FontWeight::SEMIBOLD)
          .child("Typing help"),
      );

    let toolbar = h_flex()
      .flex_none()
      .items_center()
      .gap_3()
      .px_5()
      .py_3()
      .border_b_1()
      .border_color(theme.border)
      .child(
        Select::new(&self.script_select)
          .w(px(230.))
          .menu_max_h(px(420.)),
      )
      .child(self.tabs(tab_index, cx))
      .map(|el| match self.tab {
        HelpTab::Compare => el
          .child(
            h_flex()
              .gap_2()
              .items_center()
              .child(
                div()
                  .text_sm()
                  .text_color(theme.muted_foreground)
                  .child("with"),
              )
              .child(
                Select::new(&self.compare_select)
                  .w(px(230.))
                  .menu_max_h(px(420.)),
              ),
          )
          .child(div().flex_1())
          .child(
            Checkbox::new("show-alternate-spellings")
              .label("Alternates")
              .tooltip("Other spellings of the compared script which give the same letter")
              .checked(self.show_alternates)
              .on_change(cx.listener(|this, checked: &bool, _, cx| {
                this.show_alternates = *checked;
                cx.notify();
              })),
          ),
        HelpTab::Typing => el.child(div().flex_1()).child(
          h_flex()
            .gap_1()
            .items_center()
            .child(
              Checkbox::new("show-alternates")
                .label("Show alternate keys")
                .checked(self.show_alternates)
                .on_change(cx.listener(|this, checked: &bool, _, cx| {
                  this.show_alternates = *checked;
                  cx.notify();
                })),
            )
            .child(self.alternates_info(cx)),
        ),
      });

    let nav = h_flex()
      .gap_1p5()
      .px_5()
      .py_2()
      .border_b_1()
      .border_color(theme.border)
      .children(
        self
          .layout
          .sections
          .iter()
          .enumerate()
          .map(|(ix, section)| {
            let accent = section_accent(section.id).base();
            h_flex()
              .id(SharedString::from(format!("jump-{ix}")))
              .gap_1p5()
              .items_center()
              .px_3()
              .py_1()
              .rounded_full()
              .border_1()
              .border_color(theme.border)
              .text_xs()
              .font_weight(gpui_kit::FontWeight::MEDIUM)
              .cursor_pointer()
              .hover(|s| s.bg(theme.accent))
              .on_click(cx.listener(move |this, _, _, cx| {
                this.scroll.scroll_to_item(ix);
                cx.notify();
              }))
              .child(dot(accent, 8.))
              .child(section.title)
          }),
      );

    let sections = self.layout.sections.iter().map(|section| {
      let accent = section_accent(section.id).base();
      v_flex()
        .pb_8()
        .gap_3()
        .child(
          h_flex()
            .gap_2()
            .items_center()
            .child(dot(accent, 10.))
            .child(
              div()
                .text_lg()
                .font_weight(gpui_kit::FontWeight::SEMIBOLD)
                .child(section.title),
            )
            .when_some(section.hint, |el, hint| {
              el.child(
                div()
                  .text_sm()
                  .text_color(theme.muted_foreground)
                  .child(hint),
              )
            }),
        )
        .child(
          v_flex().gap_4().children(
            section
              .groups
              .iter()
              .map(|g| self.group(section.id, section.title, g, cx)),
          ),
        )
        .into_any_element()
    });
    let mut body: Vec<AnyElement> = sections.collect();
    if self.tab == HelpTab::Typing
      && let Some(controls) = &self.layout.controls
      && !controls.is_empty()
    {
      body.push(self.controls(controls, cx).into_any_element());
    }

    v_flex()
      .id("typing-help")
      .track_focus(&self.focus)
      .size_full()
      .bg(theme.background)
      .text_color(theme.foreground)
      .capture_key_down(|event: &KeyDownEvent, _, cx| {
        if super::is_typing_toggle_key(event) {
          super::toggle_typing_from_shortcut(cx);
          cx.stop_propagation();
        }
      })
      .child(header)
      .child(toolbar)
      .child(nav)
      .child(
        div()
          .id("help-scroll")
          .flex_1()
          .min_h_0()
          .overflow_y_scroll()
          .track_scroll(&self.scroll)
          .px_5()
          .py_4()
          .children(body),
      )
  }
}
