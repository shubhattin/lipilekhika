//! The "Typing : On/Off" popup shown after the shortcut or the tray toggles the typing.

use super::styles::GREEN;
use gpui_kit::component::{ActiveTheme as _, Icon, h_flex};
use gpui_kit::prelude::FluentBuilder as _;
use gpui_kit::{
  Context, IntoElement, ParentElement as _, Render, Styled as _, Window, div, px, rgb,
};

pub struct TypingNotification {
  enabled: bool,
}

impl TypingNotification {
  pub fn new(enabled: bool) -> Self {
    Self { enabled }
  }
}

impl Render for TypingNotification {
  fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
    let icon = if self.enabled {
      gpui_kit::assets::IconName::Keyboard
    } else {
      gpui_kit::assets::IconName::KeyboardOff
    };
    let accent = if self.enabled {
      GREEN.base()
    } else {
      cx.theme().muted_foreground
    };
    // On Windows the system rounds the window (and draws its border), the box fills it square.
    // Elsewhere the window is transparent and the box is rounded.
    div()
      .size_full()
      .flex()
      .items_center()
      .justify_center()
      .bg(rgb(0x18181b))
      .when(!cfg!(windows), |el| {
        el.rounded(px(12.)).border_1().border_color(rgb(0x3f3f46))
      })
      .child(
        h_flex()
          .gap_2()
          .items_center()
          .text_color(rgb(0xfafafa))
          .child(Icon::new(icon).size(px(18.)).text_color(accent))
          .child(div().text_lg().child("Typing"))
          .child(
            div()
              .text_lg()
              .font_weight(gpui_kit::FontWeight::SEMIBOLD)
              .text_color(accent)
              .child(if self.enabled { "On" } else { "Off" }),
          ),
      )
  }
}
