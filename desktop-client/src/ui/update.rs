//! A newer version: the app checks GitHub once per start. It shows a popup (a toast in the window,
//! it does not take the keys) on its first few starts, with Later to stop it. After that, or when
//! the popup is closed, a small link at the bottom of the windows offers the update.
//!
//! The update installs the new MSI on Windows; elsewhere (and in the portable app) it opens the
//! new version's release page.

use super::Controller;
use super::styles::GREEN;
use crate::version_check::{self, UpdateResult, VersionCheckResult};
use gpui_kit::component::button::{Button, ButtonVariants as _};
use gpui_kit::component::notification::Notification;
use gpui_kit::component::{Icon, Sizable as _, WindowExt as _, h_flex};
use gpui_kit::{
  AnyElement, AnyWindowHandle, App, InteractiveElement as _, IntoElement, ParentElement as _,
  StatefulInteractiveElement as _, Styled as _, div, px,
};

/// On how many starts the popup is shown for a version
const MAX_PROMPTS: u8 = 3;

/// The update's state
#[derive(Debug, Clone, Default)]
pub struct UpdateState {
  pub check: Option<VersionCheckResult>,
  pub in_progress: bool,
  /// the popup was shown on this start
  prompted: bool,
  /// the popup is on screen (the link waits until it is gone)
  popup_open: bool,
}

impl UpdateState {
  /// The newer version, when there is one to offer
  pub fn available_version(&self) -> Option<&str> {
    let check = self.check.as_ref()?;
    if !check.update_available {
      return None;
    }
    check.latest_version.as_deref()
  }
}

/// Checks for a newer version in the background, then shows the popup
pub fn start_version_check(cx: &mut App) {
  cx.spawn(async move |cx| {
    let result = cx
      .background_executor()
      .spawn(async { version_check::check_for_updates() })
      .await;
    cx.update(|cx| {
      cx.global_mut::<Controller>().update.check = Some(result);
      prompt_update(cx);
      cx.refresh_windows();
    });
  })
  .detach();
}

/// Whether the update installs the new version itself (the MSI on Windows), else it opens the
/// release page
fn installs_update() -> bool {
  cfg!(windows) && !crate::portable::is_portable()
}

/// The update: installs the new MSI on Windows, opens the release page elsewhere
pub fn run_update(cx: &mut App) {
  let controller = cx.global::<Controller>();
  if controller.update.in_progress {
    return;
  }
  let Some(check) = controller.update.check.clone() else {
    return;
  };
  if !installs_update() {
    match &check.latest_version {
      Some(version) => cx.open_url(&format!("{}/tag/pc-app%40v{version}", super::RELEASES_URL)),
      None => cx.open_url(super::RELEASES_URL),
    }
    return;
  }
  let (Some(url), Some(version)) = (check.windows_msi_download_url, check.latest_version) else {
    return;
  };
  cx.global_mut::<Controller>().update.in_progress = true;
  cx.refresh_windows();
  cx.spawn(async move |cx| {
    let result = cx
      .background_executor()
      .spawn(async move { version_check::download_and_install_update(url, version) })
      .await;
    cx.update(|cx| match result {
      UpdateResult::InstallerLaunched => cx.quit(),
      other => {
        eprintln!("Update failed: {other:?}");
        cx.global_mut::<Controller>().update.in_progress = false;
        cx.refresh_windows();
      }
    });
  })
  .detach();
}

/// The update's label: "Update to v1.2.3", or "Updating…" while the installer downloads
fn update_label(version: &str, in_progress: bool) -> String {
  if in_progress {
    "Updating…".to_string()
  } else {
    format!("Update to v{version}")
  }
}

/// Shows the popup in a window of the app, once per start and on the first [`MAX_PROMPTS`]
/// starts for a version. Called when the check is done and when a window opens (the app may
/// start with its windows in the tray).
pub fn prompt_update(cx: &mut App) {
  let controller = Controller::global(cx);
  let update = &controller.update;
  if update.prompted {
    return;
  }
  let Some(version) = update.available_version().map(str::to_string) else {
    return;
  };
  let Some(handle) = prompt_window(cx) else {
    return;
  };
  let state = Controller::app_state(cx);
  {
    let mut saved = state.persitent_state.lock().unwrap();
    if saved.update_prompt_version != version {
      saved.update_prompt_version = version.clone();
      saved.update_prompt_count = 0;
    }
    if saved.update_prompt_count >= MAX_PROMPTS {
      return;
    }
    saved.update_prompt_count += 1;
  }
  Controller::save_config(cx);
  let update = &mut cx.global_mut::<Controller>().update;
  update.prompted = true;
  update.popup_open = true;
  let _ = handle.update(cx, |_, window, cx| {
    window.push_notification(popup(version), cx);
  });
}

/// The window the popup shows in: the one in front, else the main window, else Lipi Parivartaka
fn prompt_window(cx: &App) -> Option<AnyWindowHandle> {
  let controller = Controller::global(cx);
  let windows = [controller.main, controller.parivartaka];
  let in_front = windows
    .into_iter()
    .flatten()
    .find(|h| controller.active_windows.contains(&h.window_id()));
  in_front.or(controller.main).or(controller.parivartaka)
}

struct UpdatePopup;

fn popup(version: String) -> Notification {
  let message = if installs_update() {
    "Install it now, or later from the link at the bottom of the window."
  } else {
    "Download it now, or later from the link at the bottom of the window."
  };
  Notification::new()
    .id::<UpdatePopup>()
    .icon(Icon::new(gpui_kit::assets::IconName::Sparkles).text_color(GREEN.base()))
    .title(format!("Version {version} is available"))
    .message(message)
    .autohide(false)
    .content(move |_, _, cx| {
      let in_progress = Controller::global(cx).update.in_progress;
      h_flex()
        .mt_2()
        .gap_2()
        .child(
          Button::new("update-later")
            .outline()
            .xsmall()
            .label("Later")
            .on_click(cx.listener(|this, _, window, cx| {
              // no popup again for this version, only the link
              let state = Controller::app_state(cx);
              state.persitent_state.lock().unwrap().update_prompt_count = MAX_PROMPTS;
              Controller::save_config(cx);
              this.dismiss(window, cx);
            })),
        )
        .child(
          Button::new("update-now")
            .success()
            .xsmall()
            .loading(in_progress)
            .label(update_label(&version, in_progress))
            .on_click(|_, _, cx| run_update(cx)),
        )
        .into_any_element()
    })
    .on_close(|_, cx| {
      cx.global_mut::<Controller>().update.popup_open = false;
      cx.refresh_windows();
    })
}

/// The link at the bottom of a window, when a newer version is there and its popup is gone
pub fn update_link(cx: &App) -> Option<AnyElement> {
  let update = &Controller::global(cx).update;
  let version = update.available_version()?;
  if update.popup_open {
    return None;
  }
  let in_progress = update.in_progress;
  let color = GREEN.text(cx);
  Some(
    h_flex()
      .id("update-link")
      .flex_shrink_0()
      .items_center()
      .gap_1()
      .text_xs()
      .text_color(color)
      .cursor_pointer()
      .child(Icon::new(gpui_kit::assets::IconName::CircleArrowDown).size(px(13.)))
      .child(div().underline().child(update_label(version, in_progress)))
      .hover(|s| s.opacity(0.8))
      .tooltip(|window, cx| {
        gpui_kit::component::tooltip::Tooltip::new(if installs_update() {
          "Installs the new version (the app restarts)"
        } else {
          "Opens the new version's page to download it"
        })
        .build(window, cx)
      })
      .on_click(|_, _, cx| run_update(cx))
      .into_any_element(),
  )
}

/// The update button of the About dialogs
pub fn about_update_button(cx: &App) -> Option<AnyElement> {
  let update = &Controller::global(cx).update;
  let version = update.available_version()?;
  Some(
    Button::new("about-update")
      .success()
      .small()
      .loading(update.in_progress)
      .icon(gpui_kit::assets::IconName::CircleArrowDown)
      .label(update_label(version, update.in_progress))
      .on_click(|_, _, cx| run_update(cx))
      .into_any_element(),
  )
}
