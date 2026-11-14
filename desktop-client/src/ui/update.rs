//! A newer version: the app checks when it starts (the website's `latest.json`, else the GitHub
//! releases, see [`version_check`]), again after 1, 5 and 30 minutes when a check fails, and every
//! 12 hours while it runs (it may stay in the tray for days). About has a small link to check now.
//! A newer version shows a popup (a toast in the window, it does not take the keys) on its first
//! few starts, with Later to stop it. After that, or when the popup is closed, a small link offers
//! the update: next to the main window's buttons at its top, at the bottom of Lipi Parivartaka.
//!
//! The update installs the new MSI on Windows; elsewhere (macOS, Linux, the portable app) it
//! opens the website's download page, which offers the right download for the system.

use super::Controller;
use super::styles::GREEN;
use crate::version_check::{self, UpdateResult, VersionCheckResult};
use gpui_kit::component::button::{Button, ButtonVariants as _};
use gpui_kit::component::notification::Notification;
use gpui_kit::component::{ActiveTheme as _, Icon, Sizable as _, WindowExt as _, h_flex};
use gpui_kit::prelude::FluentBuilder as _;
use gpui_kit::{
  AnyElement, AnyWindowHandle, App, AsyncApp, InteractiveElement as _, IntoElement,
  ParentElement as _, StatefulInteractiveElement as _, Styled as _, div, px,
};
use std::time::Duration;

/// On how many starts the popup is shown for a version
const MAX_PROMPTS: u8 = 3;
/// The waits before the next check after a failed one, then [`CHECK_EVERY`]
const RETRY_AFTER: [Duration; 3] = [
  Duration::from_secs(60),
  Duration::from_secs(5 * 60),
  Duration::from_secs(30 * 60),
];
/// The wait between the checks while the app runs
const CHECK_EVERY: Duration = Duration::from_secs(12 * 60 * 60);

/// Where the check is
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum CheckStatus {
  #[default]
  NotChecked,
  Checking,
  /// the last check worked (the result is in [`UpdateState::check`])
  Done,
  /// the last check failed (an earlier result is kept)
  Failed,
}

/// The update's state
#[derive(Debug, Clone, Default)]
pub struct UpdateState {
  /// the last check that worked
  pub check: Option<VersionCheckResult>,
  pub status: CheckStatus,
  pub in_progress: bool,
  /// the version the popup was shown for on this start
  prompted_version: Option<String>,
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
    Some(&check.latest_version)
  }
}

/// Checks for a newer version in the background now, then again (see [`RETRY_AFTER`] and
/// [`CHECK_EVERY`]), and shows the popup for a newer version
pub fn start_version_check(cx: &mut App) {
  cx.spawn(async move |cx| {
    let mut failures = 0;
    loop {
      let wait = match run_check(cx, true).await {
        Some(true) => {
          failures = 0;
          CHECK_EVERY
        }
        Some(false) => {
          let wait = RETRY_AFTER.get(failures).copied().unwrap_or(CHECK_EVERY);
          failures += 1;
          wait
        }
        // a check from About is running
        None => RETRY_AFTER[0],
      };
      cx.background_executor().timer(wait).await;
    }
  })
  .detach();
}

/// Checks now (About's link). No popup: About shows the result.
pub fn check_now(cx: &mut App) {
  cx.spawn(async move |cx| {
    run_check(cx, false).await;
  })
  .detach();
}

/// One check: whether it worked, or None when a check is running already
async fn run_check(cx: &mut AsyncApp, prompt: bool) -> Option<bool> {
  let started = cx.update(|cx| {
    let update = &mut cx.global_mut::<Controller>().update;
    if update.status == CheckStatus::Checking {
      return false;
    }
    update.status = CheckStatus::Checking;
    cx.refresh_windows();
    true
  });
  if !started {
    return None;
  }
  let result = cx
    .background_executor()
    .spawn(async { version_check::check_for_updates() })
    .await;
  let worked = result.is_ok();
  cx.update(|cx| {
    let update = &mut cx.global_mut::<Controller>().update;
    match result {
      Ok(check) => {
        update.check = Some(check);
        update.status = CheckStatus::Done;
      }
      Err(_) => update.status = CheckStatus::Failed,
    }
    if worked && prompt {
      prompt_update(cx);
    }
    cx.refresh_windows();
  });
  Some(worked)
}

/// Whether the update installs the new version itself (the MSI on Windows), else it opens the
/// download page
fn installs_update() -> bool {
  cfg!(windows) && !crate::portable::is_portable()
}

/// The update: installs the new MSI on Windows, opens the download page elsewhere
pub fn run_update(cx: &mut App) {
  let controller = cx.global::<Controller>();
  if controller.update.in_progress {
    return;
  }
  let Some(check) = controller.update.check.clone() else {
    return;
  };
  if !installs_update() {
    cx.open_url(super::DOWNLOAD_URL);
    return;
  }
  let (url, version) = (check.windows_msi_download_url, check.latest_version);
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

/// Shows the popup in a window of the app, once per start for a version and on the first
/// [`MAX_PROMPTS`] starts for it. Called when a check is done and when a window opens (the app may
/// start with its windows in the tray).
pub fn prompt_update(cx: &mut App) {
  let controller = Controller::global(cx);
  let update = &controller.update;
  let Some(version) = update.available_version().map(str::to_string) else {
    return;
  };
  if update.prompted_version.as_deref() == Some(version.as_str()) {
    return;
  }
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
  update.prompted_version = Some(version.clone());
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
    "Install it now, or later from the Update link in the window."
  } else {
    "Download it now, or later from the Update link in the window."
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

/// The update link of a window, when a newer version is there and its popup is gone
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

/// The line under the version in the About dialogs: a small link to check for a newer version,
/// and how the last check went. Nothing while a newer version is offered (its button shows).
pub fn about_check_line(cx: &App) -> Option<AnyElement> {
  let update = &Controller::global(cx).update;
  if update.available_version().is_some() {
    return None;
  }
  let (status, action) = match update.status {
    CheckStatus::NotChecked => (None, Some("Check for updates")),
    CheckStatus::Checking => (Some("Checking for updates…"), None),
    CheckStatus::Done => (Some("Up to date"), Some("Check again")),
    CheckStatus::Failed => (Some("Could not check for updates"), Some("Try again")),
  };
  let muted = cx.theme().muted_foreground;
  let hover = cx.theme().foreground;
  Some(
    h_flex()
      .gap_1()
      .text_xs()
      .text_color(muted)
      .children(status)
      .when(status.is_some() && action.is_some(), |el| el.child("·"))
      .children(action.map(|label| {
        div()
          .id("about-check-update")
          .cursor_pointer()
          .underline()
          .hover(move |s| s.text_color(hover))
          .child(label)
          .on_click(|_, _, cx| check_now(cx))
      }))
      .into_any_element(),
  )
}
