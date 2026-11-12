//! Colours and small styled pieces shared by the windows.

use gpui_kit::component::{ActiveTheme as _, Theme};
use gpui_kit::{
  App, Hsla, IntoElement, ParentElement as _, SharedString, Styled as _, div, px, rgb,
};

/// A colour family, like tailwind's (`sky`, `rose`, ...): its 500 shade and the text shades
#[derive(Debug, Clone, Copy)]
pub struct Tone {
  base: u32,
  light_text: u32,
  dark_text: u32,
}

pub const SKY: Tone = Tone {
  base: 0x0ea5e9,
  light_text: 0x0369a1,
  dark_text: 0x7dd3fc,
};
pub const ROSE: Tone = Tone {
  base: 0xf43f5e,
  light_text: 0xbe123c,
  dark_text: 0xfda4af,
};
pub const EMERALD: Tone = Tone {
  base: 0x10b981,
  light_text: 0x047857,
  dark_text: 0x6ee7b7,
};
pub const VIOLET: Tone = Tone {
  base: 0x8b5cf6,
  light_text: 0x6d28d9,
  dark_text: 0xc4b5fd,
};
pub const AMBER: Tone = Tone {
  base: 0xf59e0b,
  light_text: 0xb45309,
  dark_text: 0xfcd34d,
};
pub const FUCHSIA: Tone = Tone {
  base: 0xd946ef,
  light_text: 0xa21caf,
  dark_text: 0xf0abfc,
};
pub const GREEN: Tone = Tone {
  base: 0x16a34a,
  light_text: 0x15803d,
  dark_text: 0x86efac,
};

impl Tone {
  pub fn base(&self) -> Hsla {
    rgb(self.base).into()
  }
  pub fn alpha(&self, a: f32) -> Hsla {
    self.base().opacity(a)
  }
  /// The text colour on the page background
  pub fn text(&self, cx: &App) -> Hsla {
    rgb(if cx.theme().is_dark() {
      self.dark_text
    } else {
      self.light_text
    })
    .into()
  }
}

/// Small adjustments on top of GPUI Kit's default themes
pub fn apply_brand(cx: &mut App) {
  Theme::update(cx, |theme| {
    theme.radius = px(8.);
    theme.radius_lg = px(12.);
  });
}

/// A key cap, like `<kbd>`
pub fn kbd(text: impl Into<SharedString>, cx: &App) -> impl IntoElement {
  let theme = cx.theme();
  div()
    .px(px(6.))
    .py(px(1.))
    .rounded(px(4.))
    .border_1()
    .border_b_2()
    .border_color(theme.border)
    .bg(theme.muted)
    .text_color(theme.foreground)
    .font_family(theme.mono_font_family.clone())
    .text_xs()
    .font_weight(gpui_kit::FontWeight::SEMIBOLD)
    .child(text.into())
}

/// A small alternate key, lighter than [`kbd`]
pub fn kbd_alt(text: impl Into<SharedString>, cx: &App) -> impl IntoElement {
  let theme = cx.theme();
  div()
    .px(px(4.))
    .rounded(px(4.))
    .border_1()
    .border_color(theme.border.opacity(0.7))
    .text_color(theme.muted_foreground)
    .font_family(theme.mono_font_family.clone())
    .text_size(px(10.))
    .line_height(px(16.))
    .child(text.into())
}

/// A coloured dot
pub fn dot(color: Hsla, size: f32) -> impl IntoElement {
  div().flex_none().size(px(size)).rounded_full().bg(color)
}
