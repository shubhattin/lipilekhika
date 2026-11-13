//! The typing tool's main window: the script, typing on/off, the typing options, and the ways
//! into the typing help and Lipi Parivartaka.

use super::about::AboutOf;
use super::option_examples::{TypingOptionExamples, typing_option_examples};
use super::script_select::{ScriptSelectState, new_script_select, set_script_select};
use super::styles::{EMERALD, GREEN, SKY, VIOLET, kbd};
use super::title_bar::{CUSTOM_TITLE_BAR, Control, title_bar};
use super::{Controller, HelpTab, typing_script};
use crate::persistent_state::ThemePreference;
use crate::platform::SYSTEM_TYPING_SUPPORTED;
use gpui_kit::component::alert::Alert;
use gpui_kit::component::button::{Button, ButtonVariants as _};
use gpui_kit::component::menu::{DropdownMenu as _, PopupMenuItem};
use gpui_kit::component::popover::Popover;
use gpui_kit::component::select::{Select, SelectEvent};
use gpui_kit::component::switch::Switch;
use gpui_kit::component::{ActiveTheme as _, Icon, IconName, Sizable as _, h_flex, v_flex};
use gpui_kit::prelude::FluentBuilder as _;
use gpui_kit::{
  Anchor, AnyElement, App, Context, Entity, FocusHandle, InteractiveElement as _, IntoElement,
  KeyDownEvent, ParentElement as _, Render, SharedString, StatefulInteractiveElement as _,
  Styled as _, Subscription, Window, div, img, px,
};
use lipilekhika::ScriptListEnum;
use lipilekhika::typing::{
  DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS, TypingContext, TypingContextOptions,
};
use std::sync::atomic::Ordering;

pub struct MainWindow {
  script_select: Entity<ScriptSelectState>,
  /// the script the select shows, to follow changes from the tray
  shown_script: ScriptListEnum,
  examples: TypingOptionExamples,
  /// the window's keys (Alt+X) reach the view through it
  focus: FocusHandle,
  _subscriptions: Vec<Subscription>,
}

impl MainWindow {
  pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
    let script = typing_script(cx);
    let script_select = new_script_select(script, false, window, cx);
    let subscriptions = vec![
      cx.subscribe_in(&script_select, window, |this, _, event, _, cx| {
        let SelectEvent::Confirm(Some(script)) = event else {
          return;
        };
        this.set_script(*script, cx);
      }),
      cx.observe_window_appearance(window, |_, _, cx| super::on_system_appearance_changed(cx)),
      cx.observe_window_activation(window, |_, window, cx| {
        super::window_activation_changed(window, cx)
      }),
    ];
    let focus = cx.focus_handle();
    window.focus(&focus, cx);
    Self {
      script_select,
      shown_script: script,
      examples: typing_option_examples(script),
      focus,
      _subscriptions: subscriptions,
    }
  }

  fn set_script(&mut self, script: ScriptListEnum, cx: &mut Context<Self>) {
    let state = Controller::app_state(cx);
    {
      let mut ctx = state.typing_context.lock().unwrap();
      let options = TypingContextOptions {
        auto_context_clear_time_ms: DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS,
        use_native_numerals: ctx.get_use_native_numerals(),
        include_inherent_vowel: ctx.get_include_inherent_vowel(),
      };
      *ctx = TypingContext::new(
        crate::data::script_list_to_typing_script(script),
        Some(options),
      );
    }
    state.persitent_state.lock().unwrap().script = script.to_string();
    self.shown_script = script;
    self.examples = typing_option_examples(script);
    Controller::notify_tray(cx);
    Controller::save_config(cx);
    cx.notify();
  }

  fn set_native_numerals(on: bool, cx: &mut App) {
    let state = Controller::app_state(cx);
    state
      .typing_context
      .lock()
      .unwrap()
      .update_use_native_numerals(on);
    state.persitent_state.lock().unwrap().native_numerals = on;
    Controller::notify_tray(cx);
    Controller::save_config(cx);
    cx.refresh_windows();
  }

  fn set_inherent_vowel(on: bool, cx: &mut App) {
    let state = Controller::app_state(cx);
    state
      .typing_context
      .lock()
      .unwrap()
      .update_include_inherent_vowel(on);
    state.persitent_state.lock().unwrap().inherent_vowel = on;
    Controller::notify_tray(cx);
    Controller::save_config(cx);
    cx.refresh_windows();
  }

  /// The theme menu
  fn theme_button(cx: &App) -> AnyElement {
    let theme_pref = Controller::global(cx).theme;
    let theme_icon = match theme_pref {
      ThemePreference::System => Icon::new(gpui_kit::assets::IconName::SunMoon),
      ThemePreference::Light => Icon::new(IconName::Sun),
      ThemePreference::Dark => Icon::new(IconName::Moon),
    };
    Button::new("theme")
      .ghost()
      .small()
      .icon(theme_icon)
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
    h_flex()
      .items_center()
      .gap_2p5()
      .child(img(super::assets::app_icon()).size(px(30.)))
      .child(
        v_flex()
          .gap_0()
          .child(
            div()
              .text_base()
              .font_weight(gpui_kit::FontWeight::SEMIBOLD)
              .child("Lipi Lekhika"),
          )
          .child(
            div()
              .text_xs()
              .text_color(cx.theme().muted_foreground)
              .child("Indian script typing tool"),
          ),
      )
      .child(div().flex_1())
      .children(super::update::update_link(cx).map(|link| div().pr_1().child(link)))
      .child(Self::theme_button(cx))
      .child(super::about::more_button(AboutOf::LipiLekhika))
      // only where the system shows the tray icon (the app would be out of reach otherwise)
      .when(crate::tray::is_available(), |el| {
        el.child(
          Button::new("to-tray")
            .ghost()
            .small()
            .icon(IconName::WindowMinimize)
            .tooltip("Hide to the tray (the app keeps running)")
            .on_click(|_, window, cx| super::hide_main_to_tray(window, cx)),
        )
      })
  }

  /// The way into Lipi Parivartaka: a large two line button
  fn parivartaka_button(cx: &App) -> impl IntoElement {
    let theme = cx.theme();
    h_flex()
      .id("parivartaka")
      .items_center()
      .gap_3()
      .px_4()
      .py_2p5()
      .rounded(theme.radius_lg)
      .border_1()
      .border_color(EMERALD.alpha(0.45))
      .bg(EMERALD.alpha(0.08))
      .cursor_pointer()
      .hover(|s| s.bg(EMERALD.alpha(0.15)))
      .active(|s| s.bg(EMERALD.alpha(0.22)))
      .on_click(|_, _, cx| super::open_parivartaka(cx))
      .child(
        div()
          .flex()
          .flex_none()
          .items_center()
          .justify_center()
          .size(px(36.))
          .rounded_full()
          .bg(EMERALD.alpha(0.18))
          .child(
            Icon::new(gpui_kit::assets::IconName::ArrowLeftRight)
              .size(px(18.))
              .text_color(EMERALD.text(cx)),
          ),
      )
      .child(
        v_flex()
          .flex_1()
          .gap_0()
          .child(
            div()
              .text_base()
              .font_weight(gpui_kit::FontWeight::SEMIBOLD)
              .child("Lipi Parivartaka"),
          )
          .child(
            div()
              .text_xs()
              .text_color(theme.muted_foreground)
              .child("Convert text from one script to another"),
          ),
      )
      .child(
        Icon::new(IconName::ChevronRight)
          .size(px(18.))
          .text_color(theme.muted_foreground),
      )
  }

  fn typing_card(&self, cx: &mut Context<Self>) -> impl IntoElement {
    let state = Controller::app_state(cx);
    let enabled = state.typing_enabled.load(Ordering::SeqCst);
    let theme = cx.theme();
    let (status, status_color) = if enabled {
      ("On", GREEN.text(cx))
    } else {
      ("Off", theme.muted_foreground)
    };
    let icon = if enabled {
      gpui_kit::assets::IconName::Keyboard
    } else {
      gpui_kit::assets::IconName::KeyboardOff
    };
    h_flex()
      .items_center()
      .gap_3()
      .px_4()
      .py_3()
      .rounded(theme.radius_lg)
      .border_1()
      .border_color(if enabled {
        GREEN.alpha(0.45)
      } else {
        theme.border
      })
      .bg(if enabled {
        GREEN.alpha(0.08)
      } else {
        theme.secondary.opacity(0.5)
      })
      .child(
        div()
          .flex()
          .items_center()
          .justify_center()
          .size(px(36.))
          .rounded_full()
          .bg(if enabled {
            GREEN.alpha(0.18)
          } else {
            theme.muted
          })
          .child(Icon::new(icon).size(px(18.)).text_color(status_color)),
      )
      .child(
        v_flex()
          .gap_0p5()
          .child(
            h_flex()
              .gap_1p5()
              .items_baseline()
              .child(
                div()
                  .font_weight(gpui_kit::FontWeight::SEMIBOLD)
                  .child("Typing"),
              )
              .child(
                div()
                  .text_sm()
                  .font_weight(gpui_kit::FontWeight::MEDIUM)
                  .text_color(status_color)
                  .child(status),
              ),
          )
          .child(
            h_flex()
              .gap_1()
              .items_center()
              .text_xs()
              .text_color(theme.muted_foreground)
              .when(SYSTEM_TYPING_SUPPORTED, |el| {
                el.child("Toggle with")
                  .child(kbd("Alt+X", cx))
                  .child("or")
                  .child(kbd("Alt+C", cx))
              })
              .when(!SYSTEM_TYPING_SUPPORTED, |el| {
                el.child("System wide typing is not on Linux yet")
              }),
          ),
      )
      .child(div().flex_1())
      .child(
        Switch::new("typing-switch")
          .checked(enabled)
          .on_change(|on, _, cx| super::set_typing_enabled(*on, cx)),
      )
  }

  fn option_row(
    id: &'static str,
    title: &'static str,
    example: Option<(String, String)>,
    font: Option<&'static str>,
    checked: bool,
    info: Option<AnyElement>,
    on_change: impl Fn(bool, &mut App) + 'static,
    cx: &App,
  ) -> impl IntoElement {
    let theme = cx.theme();
    h_flex()
      .items_center()
      .gap_3()
      .child(
        v_flex()
          .flex_1()
          .gap_0p5()
          .child(
            h_flex()
              .gap_1()
              .items_center()
              .child(
                div()
                  .text_sm()
                  .font_weight(gpui_kit::FontWeight::MEDIUM)
                  .child(title),
              )
              .when_some(info, |el, info| el.child(info)),
          )
          .child(match example {
            Some((input, output)) => h_flex()
              .gap_1()
              .items_center()
              .text_xs()
              .text_color(theme.muted_foreground)
              .child(SharedString::from(input))
              .child("→")
              .child(
                div()
                  .text_sm()
                  .text_color(theme.foreground)
                  .when_some(font, |el, f| el.font_family(f))
                  .child(SharedString::from(output)),
              )
              .into_any_element(),
            None => div()
              .text_xs()
              .text_color(theme.muted_foreground)
              .child("No effect in this script")
              .into_any_element(),
          }),
      )
      .child(
        Switch::new(id)
          .checked(checked)
          .on_change(move |on, _, cx| on_change(*on, cx)),
      )
  }

  fn options_card(&self, cx: &mut Context<Self>) -> impl IntoElement {
    let state = Controller::app_state(cx);
    let (native, inherent) = {
      let ctx = state.typing_context.lock().unwrap();
      (
        ctx.get_use_native_numerals(),
        ctx.get_include_inherent_vowel(),
      )
    };
    let font = crate::data::script_font_family(self.shown_script);
    let numerals_example = self.examples.numerals.as_ref().map(|e| {
      (
        "1".to_string(),
        if native { e.on.clone() } else { e.off.clone() },
      )
    });
    let vowel_example = self.examples.vowel.as_ref().map(|e| {
      (
        "k".to_string(),
        if inherent {
          e.on.clone()
        } else {
          e.off.clone()
        },
      )
    });
    let theme = cx.theme();
    let info = Popover::new("inherent-vowel-info")
      .anchor(Anchor::TopCenter)
      .trigger(
        Button::new("inherent-vowel-info-btn")
          .ghost()
          .xsmall()
          .icon(IconName::Info),
      )
      .w(px(260.))
      .child(
        v_flex()
          .gap_2()
          .text_sm()
          .child(
            div()
              .font_weight(gpui_kit::FontWeight::SEMIBOLD)
              .child("Schwa deletion"),
          )
          .child(
            div()
              .text_xs()
              .text_color(theme.muted_foreground)
              .child("Keeps the inherent vowel (schwa) of a consonant, as in Hindi."),
          )
          .child(
            v_flex()
              .gap_1()
              .font_family("Noto Sans Devanagari")
              .child("rAm → राम (on)")
              .child("rAm → राम् (off)"),
          ),
      )
      .into_any_element();
    v_flex()
      .gap_3()
      .px_4()
      .py_3()
      .rounded(theme.radius_lg)
      .border_1()
      .border_color(theme.border)
      .child(Self::option_row(
        "native-numerals",
        "Native numerals",
        numerals_example,
        font,
        native,
        None,
        |on, cx| Self::set_native_numerals(on, cx),
        cx,
      ))
      .child(div().h(px(1.)).bg(theme.border))
      .child(Self::option_row(
        "inherent-vowel",
        "Inherent vowel",
        vowel_example,
        font,
        inherent,
        Some(info),
        |on, cx| Self::set_inherent_vowel(on, cx),
        cx,
      ))
  }
}

impl Render for MainWindow {
  fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
    // the tray (or the hook) may have changed the script
    let script = typing_script(cx);
    if script != self.shown_script {
      self.shown_script = script;
      self.examples = typing_option_examples(script);
      set_script_select(&self.script_select, script, window, cx);
    }
    let theme = cx.theme().clone();
    let script = self.shown_script;

    let content = v_flex()
      .flex_1()
      .px_5()
      .pt(if CUSTOM_TITLE_BAR { px(6.) } else { px(16.) })
      .pb_4()
      .gap_3p5()
      .when(!CUSTOM_TITLE_BAR, |el| el.child(self.header(cx)))
      .child(
        v_flex()
          .gap_1p5()
          .child(
            div()
              .text_xs()
              .font_weight(gpui_kit::FontWeight::SEMIBOLD)
              .text_color(theme.muted_foreground)
              .child("SCRIPT"),
          )
          .child(Select::new(&self.script_select).w_full().menu_max_h(px(380.))),
      )
      .child(self.typing_card(cx))
      .child(self.options_card(cx))
      .child(
        h_flex()
          .gap_2()
          .child(
            Button::new("typing-help")
              .outline()
              .small()
              .flex_1()
              .icon(Icon::new(gpui_kit::assets::IconName::Keyboard).text_color(SKY.text(cx)))
              .label("Typing help")
              .on_click(move |_, window, cx| {
                super::open_typing_help(script, HelpTab::Typing, Some(window), cx)
              }),
          )
          .child(
            Button::new("compare")
              .outline()
              .small()
              .flex_1()
              .icon(Icon::new(gpui_kit::assets::IconName::Columns2).text_color(VIOLET.text(cx)))
              .label("Compare scripts")
              .on_click(move |_, window, cx| {
                super::open_typing_help(script, HelpTab::Compare, Some(window), cx)
              }),
          ),
      )
      .child(Self::parivartaka_button(cx))
      .when(!SYSTEM_TYPING_SUPPORTED, |el| {
        el.child(
          Alert::info(
            "linux-typing",
            "To type in any app on Linux, use the Lipi Lekhika Fcitx5 plugin. Lipi Parivartaka types here as well.",
          )
          .small(),
        )
      });

    v_flex()
      .id("main-window")
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
      .when(CUSTOM_TITLE_BAR, |el| {
        el.child(title_bar(
          "Lipi Lekhika",
          // the update link (when there is a newer version) next to the buttons
          super::update::update_link(cx)
            .into_iter()
            .chain([
              Self::theme_button(cx),
              super::about::more_button(AboutOf::LipiLekhika),
            ])
            .collect(),
          &[Control::Minimize, Control::Close],
          window,
          cx,
        ))
      })
      .child(content)
  }
}
