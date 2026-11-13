//! The app's own title bar on Windows: the icon, the window's name, its buttons (theme, menu) and
//! the window controls in one row, instead of the system title bar above an in-window header.
//!
//! Elsewhere the system draws the title bar (macOS) or none is drawn at all (tiling Wayland
//! compositors): the windows show their header there.

use gpui_kit::component::{ActiveTheme as _, Icon, IconName, Sizable as _, h_flex};
use gpui_kit::prelude::FluentBuilder as _;
use gpui_kit::{
  AnyElement, App, InteractiveElement as _, IntoElement, ParentElement as _, SharedString,
  StatefulInteractiveElement as _, Styled as _, Window, WindowControlArea, div, img, px,
};

/// Whether the windows draw their own title bar
pub const CUSTOM_TITLE_BAR: bool = cfg!(windows);

/// The title bar's height
pub const TITLE_BAR_HEIGHT: f32 = 40.;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Control {
  Minimize,
  Maximize,
  Close,
}

impl Control {
  fn id(self) -> &'static str {
    match self {
      Self::Minimize => "title-minimize",
      Self::Maximize => "title-maximize",
      Self::Close => "title-close",
    }
  }

  fn area(self) -> WindowControlArea {
    match self {
      Self::Minimize => WindowControlArea::Min,
      Self::Maximize => WindowControlArea::Max,
      Self::Close => WindowControlArea::Close,
    }
  }
}

/// A window control button. The system handles the click (it hit tests the button's area), like
/// its own caption buttons, so snap layouts on the maximize button work too.
fn control_button(control: Control, window: &Window, cx: &App) -> impl IntoElement {
  let theme = cx.theme();
  let is_close = control == Control::Close;
  let icon = match control {
    Control::Minimize => IconName::WindowMinimize,
    Control::Maximize if window.is_maximized() => IconName::WindowRestore,
    Control::Maximize => IconName::WindowMaximize,
    Control::Close => IconName::WindowClose,
  };
  let (hover_bg, hover_fg) = if is_close {
    (
      gpui_kit::rgb(0xc42b1c).into(),
      gpui_kit::rgb(0xffffff).into(),
    )
  } else {
    (theme.secondary_hover, theme.foreground)
  };
  div()
    .id(control.id())
    .flex()
    .flex_shrink_0()
    .items_center()
    .justify_center()
    .w(px(46.))
    .h_full()
    .text_color(theme.foreground)
    .hover(move |s| s.bg(hover_bg).text_color(hover_fg))
    .active(move |s| s.bg(hover_bg.opacity(0.85)).text_color(hover_fg))
    .window_control_area(control.area())
    .child(Icon::new(icon).small())
}

/// The title bar: `title` next to the app icon, then `actions` (small buttons) and `controls`
pub fn title_bar(
  title: impl Into<SharedString>,
  actions: Vec<AnyElement>,
  controls: &[Control],
  window: &Window,
  cx: &App,
) -> impl IntoElement {
  let theme = cx.theme();
  h_flex()
    .id("title-bar")
    .flex_shrink_0()
    .h(px(TITLE_BAR_HEIGHT))
    .items_center()
    .bg(theme.background)
    .text_color(theme.foreground)
    .child(
      // the empty part of the bar moves the window
      h_flex()
        .id("title-drag")
        .flex_1()
        .h_full()
        .items_center()
        .gap_2()
        .pl_3()
        .window_control_area(WindowControlArea::Drag)
        .child(img(super::assets::app_icon()).size(px(18.)))
        .child(
          div()
            .text_sm()
            .font_weight(gpui_kit::FontWeight::MEDIUM)
            .text_color(if window.is_window_active() {
              theme.foreground
            } else {
              theme.muted_foreground
            })
            .child(title.into()),
        ),
    )
    .when(!actions.is_empty(), |el| {
      el.child(
        h_flex()
          .h_full()
          .items_center()
          .gap_0p5()
          .pr_2()
          .children(actions),
      )
    })
    .children(
      controls
        .iter()
        .map(|c| control_button(*c, window, cx).into_any_element()),
    )
}
