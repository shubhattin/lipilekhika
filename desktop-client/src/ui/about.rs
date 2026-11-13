//! The ⋯ menu of the main window and Lipi Parivartaka, and their About dialogs. Both show the
//! app's version: Lipi Parivartaka is a part of Lipi Lekhika, it comes with it.

use gpui_kit::component::button::{Button, ButtonVariants as _};
use gpui_kit::component::menu::{DropdownMenu as _, PopupMenuItem};
use gpui_kit::component::{
  ActiveTheme as _, IconName, Sizable as _, WindowExt as _, h_flex, v_flex,
};
use gpui_kit::prelude::FluentBuilder as _;
use gpui_kit::{
  Anchor, AnyElement, App, IntoElement, ParentElement as _, Styled as _, Window, div, img, px,
};

/// Whose ⋯ menu and About dialog
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AboutOf {
  LipiLekhika,
  LipiParivartaka,
}

impl AboutOf {
  fn name(self) -> &'static str {
    match self {
      Self::LipiLekhika => "Lipi Lekhika",
      Self::LipiParivartaka => "Lipi Parivartaka",
    }
  }

  fn tagline(self) -> &'static str {
    match self {
      Self::LipiLekhika => "Type Indian Languages with full Speed and Accuracy",
      Self::LipiParivartaka => "Convert text from one script to another",
    }
  }
}

/// The About dialog
pub fn open_about(of: AboutOf, window: &mut Window, cx: &mut App) {
  window.open_dialog(cx, move |dialog, _, cx| {
    let muted = cx.theme().muted_foreground;
    dialog.w(px(340.)).child(
      v_flex()
        .items_center()
        .gap_3()
        .py_2()
        .child(img(super::assets::app_icon()).size(px(56.)))
        .child(
          v_flex()
            .items_center()
            .gap_0p5()
            .child(
              div()
                .text_xl()
                .font_weight(gpui_kit::FontWeight::SEMIBOLD)
                .child(of.name()),
            )
            .child(
              div()
                .text_xs()
                .text_color(muted)
                .child(format!("Version {}", env!("CARGO_PKG_VERSION"))),
            ),
        )
        .child(
          div()
            .text_sm()
            .text_center()
            .text_color(muted)
            .child(of.tagline()),
        )
        .when(of == AboutOf::LipiParivartaka, |el| {
          el.child(
            div()
              .text_xs()
              .text_center()
              .text_color(muted)
              .child("Lipi Parivartaka is a part of Lipi Lekhika."),
          )
        })
        .child(
          h_flex()
            .gap_2()
            .child(
              Button::new("about-github")
                .outline()
                .small()
                .icon(IconName::Github)
                .label("GitHub")
                .on_click(|_, _, cx| cx.open_url(super::GITHUB_URL)),
            )
            .child(
              Button::new("about-website")
                .outline()
                .small()
                .icon(IconName::Globe)
                .label("lipilekhika.in")
                .on_click(|_, _, cx| cx.open_url(super::WEBSITE_URL)),
            ),
        )
        .children(super::update::about_update_button(cx)),
    )
  });
}

/// The ⋯ menu: About, the links, and Quit in the main window
pub fn more_button(of: AboutOf) -> AnyElement {
  Button::new("more")
    .ghost()
    .small()
    .icon(IconName::Ellipsis)
    .tooltip("More")
    .dropdown_menu_with_anchor(Anchor::TopRight, move |menu, _, _| {
      menu
        .item(
          PopupMenuItem::new(format!("About {}", of.name()))
            .icon(IconName::Info)
            .on_click(move |_, window, cx| open_about(of, window, cx)),
        )
        .item(
          PopupMenuItem::new("GitHub")
            .icon(IconName::Github)
            .on_click(|_, _, cx| cx.open_url(super::GITHUB_URL)),
        )
        .item(
          PopupMenuItem::new("Website")
            .icon(IconName::Globe)
            .on_click(|_, _, cx| cx.open_url(super::WEBSITE_URL)),
        )
        .when(of == AboutOf::LipiLekhika, |menu| {
          menu.separator().item(
            PopupMenuItem::new("Quit")
              .icon(IconName::WindowClose)
              .on_click(|_, _, cx| cx.quit()),
          )
        })
    })
    .into_any_element()
}
