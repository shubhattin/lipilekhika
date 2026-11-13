//! The short popups at the top of the screen: "Typing : On/Off" after the shortcut or the tray
//! toggles the typing, and "in the tray" when the main window hides to the tray.

use super::styles::GREEN;
use gpui_kit::component::{ActiveTheme as _, Icon, h_flex};
use gpui_kit::prelude::FluentBuilder as _;
use gpui_kit::{
  Context, IntoElement, ParentElement as _, Render, Styled as _, Window, div, img, px, rgb,
};

/// What the popup says
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Popup {
  /// the system wide typing was turned on (`true`) or off
  Typing(bool),
  /// the main window was hidden, the app goes on in the tray
  InTray,
}

impl Popup {
  /// The popup window's width
  pub fn width(self) -> f32 {
    match self {
      Self::Typing(_) => 190.,
      Self::InTray => 270.,
    }
  }
}

pub struct PopupView {
  popup: Popup,
}

impl PopupView {
  pub fn new(popup: Popup) -> Self {
    Self { popup }
  }
}

impl Render for PopupView {
  fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
    let content = match self.popup {
      Popup::Typing(enabled) => {
        let icon = if enabled {
          gpui_kit::assets::IconName::Keyboard
        } else {
          gpui_kit::assets::IconName::KeyboardOff
        };
        let accent = if enabled {
          GREEN.base()
        } else {
          cx.theme().muted_foreground
        };
        h_flex()
          .gap_2()
          .items_center()
          .child(Icon::new(icon).size(px(18.)).text_color(accent))
          .child(div().text_lg().child("Typing"))
          .child(
            div()
              .text_lg()
              .font_weight(gpui_kit::FontWeight::SEMIBOLD)
              .text_color(accent)
              .child(if enabled { "On" } else { "Off" }),
          )
      }
      Popup::InTray => h_flex()
        .gap_2p5()
        .items_center()
        .child(img(super::assets::app_icon()).size(px(20.)))
        .child(div().text_base().child("Lipi Lekhika is in the tray")),
    };
    // On Windows the system rounds the window (and draws its border), the box fills it square.
    // Elsewhere the window is transparent and the box is rounded.
    div()
      .size_full()
      .flex()
      .items_center()
      .justify_center()
      .bg(rgb(0x18181b))
      .text_color(rgb(0xfafafa))
      .when(!cfg!(windows), |el| {
        el.rounded(px(12.)).border_1().border_color(rgb(0x3f3f46))
      })
      .child(content)
  }
}
