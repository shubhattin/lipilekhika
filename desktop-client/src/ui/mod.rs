//! The GPUI app: the typing tool's main window, the typing help and Lipi Parivartaka.

mod assets;
mod main_window;
mod notification;
mod option_examples;
mod parivartaka;
mod script_select;
mod styles;
mod typing_help;

use crate::persistent_state::ThemePreference;
use crate::version_check::{self, UpdateResult, VersionCheckResult};
use crate::{AppState, StartupView, ThreadMessage, ThreadMessageOrigin, ThreadMessageType};
use crossbeam_channel::{Receiver, Sender};
use gpui_kit::component::{Theme, ThemeMode};
use gpui_kit::{
  AnyWindowHandle, App, AppContext as _, Bounds, Global, QuitMode, SharedString, TitlebarOptions,
  WindowAppearance, WindowBounds, WindowDecorations, WindowId, WindowKind, WindowOptions, point,
  px, size,
};
use lipilekhika::ScriptListEnum;
use std::sync::Arc;
use std::sync::atomic::Ordering;
use std::time::Duration;

pub use typing_help::HelpTab;

/// The main window's height (it has a note about the Fcitx5 plugin on Linux)
const MAIN_HEIGHT: f32 = if crate::platform::SYSTEM_TYPING_SUPPORTED {
  450.
} else {
  530.
};

pub const GITHUB_URL: &str = "https://github.com/shubhattin/lipilekhika";
pub const WEBSITE_URL: &str = "https://lipilekhika.in";
pub const RELEASES_URL: &str = "https://github.com/shubhattin/lipilekhika/releases";

/// The update banner's state
#[derive(Debug, Clone, Default)]
pub struct UpdateState {
  pub check: Option<VersionCheckResult>,
  pub dismissed: bool,
  pub in_progress: bool,
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

/// The app wide state of the UI: the windows that are open and the shared settings
pub struct Controller {
  pub app_state: Arc<AppState>,
  tx_tray: Sender<ThreadMessage>,
  main: Option<AnyWindowHandle>,
  parivartaka: Option<AnyWindowHandle>,
  helper: Option<(
    AnyWindowHandle,
    gpui_kit::WeakEntity<typing_help::TypingHelp>,
  )>,
  notification: Option<AnyWindowHandle>,
  /// the main window was closed to the tray (the app keeps running)
  main_in_tray: bool,
  pub theme: ThemePreference,
  pub update: UpdateState,
}

impl Global for Controller {}

impl Controller {
  pub fn global(cx: &App) -> &Self {
    cx.global::<Self>()
  }

  pub fn app_state(cx: &App) -> Arc<AppState> {
    Arc::clone(&cx.global::<Self>().app_state)
  }

  /// Tells the tray to read the app state again
  pub fn notify_tray(cx: &App) {
    let _ = cx.global::<Self>().tx_tray.send(ThreadMessage {
      origin: ThreadMessageOrigin::UI,
      msg: ThreadMessageType::RerenderTray,
    });
  }

  /// Writes the app config (script, typing options, theme) in the background
  pub fn save_config(cx: &App) {
    let state = Self::app_state(cx);
    let config = state.persitent_state.lock().unwrap().clone();
    cx.background_executor()
      .spawn(async move {
        if let Err(err) = config.save_app_config() {
          eprintln!("{err}");
        }
      })
      .detach();
  }
}

/// The current script of the system wide typing
pub fn typing_script(cx: &App) -> ScriptListEnum {
  let state = Controller::app_state(cx);
  let ctx = state.typing_context.lock().unwrap();
  crate::data::script_from_normalized_name(ctx.get_normalized_script())
    .unwrap_or(ScriptListEnum::Devanagari)
}

// ---- Theme ----

fn mode_for(pref: ThemePreference, cx: &App) -> ThemeMode {
  match pref {
    ThemePreference::Light => ThemeMode::Light,
    ThemePreference::Dark => ThemeMode::Dark,
    ThemePreference::System => match cx.window_appearance() {
      WindowAppearance::Dark | WindowAppearance::VibrantDark => ThemeMode::Dark,
      _ => ThemeMode::Light,
    },
  }
}

/// Applies the theme preference to every window
pub fn apply_theme(cx: &mut App) {
  let pref = Controller::global(cx).theme;
  let mode = mode_for(pref, cx);
  if cx.theme_mode() != Some(mode) {
    Theme::change(mode, None, cx);
  }
  styles::apply_brand(cx);
}

trait ThemeModeExt {
  fn theme_mode(&self) -> Option<ThemeMode>;
}
impl ThemeModeExt for App {
  fn theme_mode(&self) -> Option<ThemeMode> {
    self.has_global::<Theme>().then(|| Theme::global(self).mode)
  }
}

pub fn set_theme(pref: ThemePreference, cx: &mut App) {
  cx.global_mut::<Controller>().theme = pref;
  {
    let state = Controller::app_state(cx);
    state.persitent_state.lock().unwrap().theme = pref;
  }
  Controller::save_config(cx);
  apply_theme(cx);
  cx.refresh_windows();
}

/// Called when the system switches between light and dark
pub fn on_system_appearance_changed(cx: &mut App) {
  if Controller::global(cx).theme == ThemePreference::System {
    apply_theme(cx);
  }
}

// ---- Windows ----

fn window_options(
  title: &str,
  width: f32,
  height: f32,
  resizable: bool,
  min: Option<(f32, f32)>,
  child: bool,
  cx: &App,
) -> WindowOptions {
  let bounds = Bounds::centered(None, size(px(width), px(height)), cx);
  WindowOptions {
    window_bounds: Some(WindowBounds::Windowed(bounds)),
    titlebar: Some(TitlebarOptions {
      title: Some(SharedString::from(title.to_string())),
      appears_transparent: false,
      traffic_light_position: None,
    }),
    is_resizable: resizable,
    window_min_size: min.map(|(w, h)| size(px(w), px(h))),
    app_id: Some("lipilekhika".into()),
    icon: assets::app_icon_rgba(),
    window_decorations: Some(WindowDecorations::Server),
    focus: true,
    show: true,
    // On Linux the other windows are children of the window they are opened from: tiling
    // compositors (Hyprland, sway) float them at their size instead of tiling them. Elsewhere a
    // child window would stay above its parent and minimize with it.
    kind: if child && cfg!(target_os = "linux") {
      WindowKind::Floating
    } else {
      WindowKind::Normal
    },
    ..Default::default()
  }
}

/// Shows the main window, opening it again if it was closed to the tray
pub fn show_main(cx: &mut App) {
  if let Some(handle) = Controller::global(cx).main {
    let _ = handle.update(cx, |_, window, _| window.activate_window());
    return;
  }
  let options = window_options("Lipi Lekhika", 480., MAIN_HEIGHT, false, None, false, cx);
  match gpui_kit::open_window(options, cx, |window, cx| {
    cx.new(|cx| main_window::MainWindow::new(window, cx))
  }) {
    Ok((handle, _)) => {
      let controller = cx.global_mut::<Controller>();
      controller.main = Some(handle);
      controller.main_in_tray = false;
    }
    Err(err) => eprintln!("Failed to open the main window: {err}"),
  }
}

/// Closes the main window, the app keeps running in the tray
pub fn hide_main_to_tray(window: &mut gpui_kit::Window, cx: &mut App) {
  cx.global_mut::<Controller>().main_in_tray = true;
  window.remove_window();
}

pub fn open_parivartaka(cx: &mut App) {
  if let Some(handle) = Controller::global(cx).parivartaka {
    let _ = handle.update(cx, |_, window, _| window.activate_window());
    return;
  }
  let options = window_options(
    "Lipi Parivartaka",
    1180.,
    800.,
    true,
    Some((720., 560.)),
    Controller::global(cx).main.is_some(),
    cx,
  );
  match gpui_kit::open_window(options, cx, |window, cx| {
    cx.new(|cx| parivartaka::Parivartaka::new(window, cx))
  }) {
    Ok((handle, _)) => cx.global_mut::<Controller>().parivartaka = Some(handle),
    Err(err) => eprintln!("Failed to open Lipi Parivartaka: {err}"),
  }
}

/// Opens the typing help (or brings it forward) on `tab` for `script`
pub fn open_typing_help(script: ScriptListEnum, tab: HelpTab, cx: &mut App) {
  let script = if script == ScriptListEnum::Normal {
    ScriptListEnum::Devanagari
  } else {
    script
  };
  if let Some((handle, view)) = Controller::global(cx).helper.clone() {
    let _ = handle.update(cx, |_, window, cx| {
      if let Some(view) = view.upgrade() {
        view.update(cx, |view, cx| view.show(script, tab, window, cx));
      }
      window.activate_window();
    });
    return;
  }
  let options = window_options(
    "Typing help",
    940.,
    780.,
    true,
    Some((560., 480.)),
    Controller::global(cx).main.is_some() || Controller::global(cx).parivartaka.is_some(),
    cx,
  );
  match gpui_kit::open_window(options, cx, |window, cx| {
    cx.new(|cx| typing_help::TypingHelp::new(script, tab, window, cx))
  }) {
    Ok((handle, view)) => {
      cx.global_mut::<Controller>().helper = Some((handle, view.downgrade()));
    }
    Err(err) => eprintln!("Failed to open the typing help: {err}"),
  }
}

/// The small "Typing : On/Off" popup at the top of the screen (from the shortcut or the tray)
pub fn show_typing_notification(cx: &mut App) {
  if let Some(old) = cx.global_mut::<Controller>().notification.take() {
    let _ = old.update(cx, |_, window, _| window.remove_window());
  }
  let enabled = Controller::app_state(cx)
    .typing_enabled
    .load(Ordering::SeqCst);
  let (w, h) = (190., 50.);
  let origin = cx
    .primary_display()
    .map(|d| {
      let b = d.bounds();
      point(
        b.origin.x + (b.size.width - px(w)) / 2.,
        b.origin.y + b.size.height * 0.05,
      )
    })
    .unwrap_or(point(px(0.), px(0.)));
  let options = WindowOptions {
    window_bounds: Some(WindowBounds::Windowed(Bounds {
      origin,
      size: size(px(w), px(h)),
    })),
    titlebar: None,
    focus: false,
    show: true,
    kind: WindowKind::PopUp,
    is_movable: false,
    is_resizable: false,
    is_minimizable: false,
    app_id: Some("lipilekhika".into()),
    window_decorations: Some(WindowDecorations::Client),
    ..Default::default()
  };
  match cx.open_window(options, |_, cx| {
    cx.new(|_| notification::TypingNotification::new(enabled))
  }) {
    Ok(handle) => {
      let handle: AnyWindowHandle = handle.into();
      cx.global_mut::<Controller>().notification = Some(handle);
      cx.spawn(async move |cx| {
        cx.background_executor()
          .timer(Duration::from_millis(1400))
          .await;
        let _ = cx.update(|cx| {
          if cx.global::<Controller>().notification == Some(handle) {
            cx.global_mut::<Controller>().notification = None;
            let _ = handle.update(cx, |_, window, _| window.remove_window());
          }
        });
      })
      .detach();
    }
    Err(err) => eprintln!("Failed to open the typing notification: {err}"),
  }
}

/// Turns the system wide typing on or off
pub fn set_typing_enabled(enabled: bool, cx: &mut App) {
  Controller::app_state(cx)
    .typing_enabled
    .store(enabled, Ordering::SeqCst);
  Controller::notify_tray(cx);
  cx.refresh_windows();
}

fn on_window_closed(id: WindowId, cx: &mut App) {
  let controller = cx.global_mut::<Controller>();
  let mut main_closed = false;
  if controller.main.is_some_and(|h| h.window_id() == id) {
    controller.main = None;
    main_closed = !controller.main_in_tray;
  }
  if controller.parivartaka.is_some_and(|h| h.window_id() == id) {
    controller.parivartaka = None;
  }
  if controller
    .helper
    .as_ref()
    .is_some_and(|(h, _)| h.window_id() == id)
  {
    controller.helper = None;
  }
  if controller.notification.is_some_and(|h| h.window_id() == id) {
    controller.notification = None;
  }
  // Closing the main window quits the app (closing it to the tray does not). Without the main
  // window (Lipi Parivartaka opened on its own), the app quits with its last window.
  let others_open = controller.parivartaka.is_some() || controller.helper.is_some();
  let main_gone = controller.main.is_none() && !controller.main_in_tray;
  if main_closed || (main_gone && !others_open) {
    cx.quit();
  }
}

// ---- Update check ----

fn start_version_check(cx: &mut App) {
  cx.spawn(async move |cx| {
    let result = cx
      .background_executor()
      .spawn(async { version_check::check_for_updates() })
      .await;
    let _ = cx.update(|cx| {
      cx.global_mut::<Controller>().update.check = Some(result);
      cx.refresh_windows();
    });
  })
  .detach();
}

/// The update button: installs the new MSI on Windows, opens the releases page elsewhere
pub fn run_update(cx: &mut App) {
  let controller = cx.global::<Controller>();
  if controller.update.in_progress {
    return;
  }
  let Some(check) = controller.update.check.clone() else {
    return;
  };
  if !cfg!(windows) {
    cx.open_url(RELEASES_URL);
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
    let _ = cx.update(|cx| match result {
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

// ---- Messages from the hook and the tray ----

fn handle_thread_message(msg: ThreadMessage, cx: &mut App) {
  if matches!(msg.origin, ThreadMessageOrigin::UI) {
    return;
  }
  match msg.msg {
    ThreadMessageType::RerenderUI => cx.refresh_windows(),
    ThreadMessageType::TriggerTypingNotification => show_typing_notification(cx),
    ThreadMessageType::MaximizeUI => show_main(cx),
    ThreadMessageType::OpenParivartaka => open_parivartaka(cx),
    ThreadMessageType::CloseApp => cx.quit(),
    ThreadMessageType::RerenderTray => {}
  }
}

fn start_thread_bridge(rx: Receiver<ThreadMessage>, cx: &mut App) {
  cx.spawn(async move |cx| {
    loop {
      cx.background_executor()
        .timer(Duration::from_millis(30))
        .await;
      let mut messages = vec![];
      loop {
        match rx.try_recv() {
          Ok(msg) => messages.push(msg),
          Err(crossbeam_channel::TryRecvError::Empty) => break,
          Err(crossbeam_channel::TryRecvError::Disconnected) => return,
        }
      }
      if messages.is_empty() {
        continue;
      }
      cx.update(|cx| {
        for msg in messages {
          handle_thread_message(msg, cx);
        }
      });
    }
  })
  .detach();
}

pub fn run(
  app_state: Arc<AppState>,
  rx_ui: Receiver<ThreadMessage>,
  tx_tray: Sender<ThreadMessage>,
  startup_view: StartupView,
) {
  let theme = app_state.persitent_state.lock().unwrap().theme;
  gpui_kit::application()
    .with_assets(assets::AppAssets)
    .with_quit_mode(QuitMode::Explicit)
    .run(move |cx| {
      gpui_kit::init(cx);
      assets::register_fonts(cx);
      cx.set_global(Controller {
        app_state,
        tx_tray,
        main: None,
        parivartaka: None,
        helper: None,
        notification: None,
        main_in_tray: false,
        theme,
        update: UpdateState::default(),
      });
      apply_theme(cx);
      parivartaka::init(cx);
      typing_help::init(cx);

      cx.on_window_closed(|cx, id| on_window_closed(id, cx))
        .detach();

      start_thread_bridge(rx_ui, cx);
      start_version_check(cx);

      match startup_view {
        StartupView::Main => show_main(cx),
        StartupView::Parivartaka => open_parivartaka(cx),
        StartupView::TypingHelp { compare } => {
          let tab = if compare {
            HelpTab::Compare
          } else {
            HelpTab::Typing
          };
          open_typing_help(typing_script(cx), tab, cx)
        }
      }
      cx.activate(true);
    });
}
