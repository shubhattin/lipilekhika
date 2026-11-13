//! The macOS menu bar: the app's menu with Hide (⌘H) and Quit (⌘Q). GPUI shows no menu of its
//! own, and the Mac keys for these come from the menu. Elsewhere there is no menu bar.

#[cfg(target_os = "macos")]
mod mac {
  use gpui_kit::{App, KeyBinding, Menu, MenuItem};

  gpui_kit::actions!(lipilekhika, [Quit, Hide, HideOthers, ShowAll]);

  pub fn init(cx: &mut App) {
    cx.on_action(|_: &Quit, cx| cx.quit());
    cx.on_action(|_: &Hide, cx| cx.hide());
    cx.on_action(|_: &HideOthers, cx| cx.hide_other_apps());
    cx.on_action(|_: &ShowAll, cx| cx.unhide_other_apps());
    cx.bind_keys([
      KeyBinding::new("cmd-q", Quit, None),
      KeyBinding::new("cmd-h", Hide, None),
      KeyBinding::new("alt-cmd-h", HideOthers, None),
    ]);
    let name = super::super::APP_NAME;
    cx.set_menus([Menu::new(name).items([
      MenuItem::action(format!("Hide {name}"), Hide),
      MenuItem::action("Hide Others", HideOthers),
      MenuItem::action("Show All", ShowAll),
      MenuItem::separator(),
      MenuItem::action(format!("Quit {name}"), Quit),
    ])]);
  }
}

/// Sets up the menu bar (macOS)
pub fn init(_cx: &mut gpui_kit::App) {
  #[cfg(target_os = "macos")]
  mac::init(_cx);
}
