use crate::data::{ScriptDisplay, get_ordered_script_list};
use crate::ui::notification::{self, NotificationConfig};
use crate::ui::thread_receive::{ThreadRx, thread_message_stream};
use crate::ui::typing_helper::{
  TypingHelperMessage, TypingHelperState, TypingHelperTab, open_typing_helper_window,
  view_typing_helper,
};
use crate::ui::version_check::{self, UpdateResult, VersionCheckResult};
use crate::{AppState, ThreadMessage, ThreadMessageOrigin, ThreadMessageType};
use crossbeam_channel::{Receiver, Sender};
use dark_light::detect;
use iced::Padding;
use iced::theme::Theme;
use iced::widget::{Space, button, center, mouse_area, opaque, stack};
use iced::{
  Element, Length, Subscription, Task,
  keyboard::{self, Key, key::Named},
  mouse,
  widget::{checkbox, column, container, image, pick_list, row, svg, text, toggler, tooltip},
  window,
};
use iced_aw::menu::{Item, Menu, MenuBar};
use lipilekhika::typing::TypingContext;
use std::env;
use std::path::PathBuf;
use std::process::Command;
use std::sync::{Arc, Mutex, atomic::Ordering};

#[derive(Clone, Debug)]
pub enum UIMessage {
  ToggleTypingMode(bool),
  KeyboardToggleTypingMode, // Toggle from keyboard shortcut (triggers notification)
  SetScript(ScriptDisplay),
  TriggerTypingNotification,
  NotificationOpened(window::Id),
  CloseNotification(window::Id),
  WindowClosed(window::Id),
  WindowCloseRequested(window::Id),
  ToogleUseNativeNumerals(bool),
  ToogleIncludeInherentVowel(bool),
  RerenderUI,
  MinimizeBackground,
  MaximizeUI,
  CloseApp,
  OpenAbout,
  CloseAbout,
  OpenLipiParivartaka,
  OpenGitHub,
  OpenWebsite,
  ToggleInherentVowelInfo,
  CloseInherentVowelInfo,
  // Typing helper
  OpenTypingHelper,
  OpenTypingHelperCompare,
  TypingHelperOpened(window::Id),
  TypingHelper(TypingHelperMessage),
  // Version check
  VersionCheckResult(VersionCheckResult),
  UpdateApp,
  UpdateAppResult(UpdateResult),
  DismissUpdateNotification,
}

const DIMS: [f32; 2] = [430.0, 230.0];

impl From<TypingHelperMessage> for UIMessage {
  fn from(msg: TypingHelperMessage) -> Self {
    UIMessage::TypingHelper(msg)
  }
}

struct App {
  global_app_state: Arc<AppState>,
  rx: Arc<Mutex<Receiver<ThreadMessage>>>,
  tx_tray: Arc<Mutex<Sender<ThreadMessage>>>,
  // Window tracking - None means minimized to tray
  main_window: Option<window::Id>,
  // Icon for re-opening window
  window_icon: window::Icon,
  // Notification state
  notification_window: Option<window::Id>,
  notification_message: String,
  notification_config: NotificationConfig,
  // About modal state
  about_modal_open: bool,
  // Inherent vowel info popover state
  inherent_vowel_info_open: bool,
  // Typing Helper window state
  typing_helper_window: Option<window::Id>,
  typing_helper_state: TypingHelperState,
  // Version check result
  version_check_result: Option<VersionCheckResult>,
  update_notification_dismissed: bool,
  update_in_progress: bool,
}

impl App {
  /// Helper function to save persistent state asynchronously
  fn save_persistent_state_async(app_state: Arc<AppState>) -> Task<UIMessage> {
    Task::future(async move {
      let state_to_save = {
        let state = app_state.persitent_state.lock().unwrap();
        state.clone()
      };
      let _ = state_to_save.save_app_config();

      UIMessage::RerenderUI
    })
  }

  fn new(
    app_state: Arc<AppState>,
    rx: Arc<Mutex<Receiver<ThreadMessage>>>,
    tx_tray: Arc<Mutex<Sender<ThreadMessage>>>,
    icon: window::Icon,
  ) -> (Self, Task<UIMessage>) {
    // Open main window since daemon mode doesn't create one automatically
    let (main_id, main_open_task) = window::open(window::Settings {
      icon: Some(icon.clone()),
      resizable: false,
      size: iced::Size::new(DIMS[0], DIMS[1]),
      position: window::Position::Centered,
      exit_on_close_request: false,
      ..Default::default()
    });

    (
      Self {
        global_app_state: app_state,
        rx,
        tx_tray,
        main_window: Some(main_id),
        window_icon: icon,
        notification_window: None,
        notification_message: String::new(),
        notification_config: NotificationConfig::default(),
        about_modal_open: false,
        inherent_vowel_info_open: false,
        typing_helper_window: None,
        typing_helper_state: TypingHelperState::new("Devanagari"),
        version_check_result: None,
        update_notification_dismissed: false,
        update_in_progress: false,
      },
      Task::batch([
        main_open_task.discard(),
        // Trigger version check on startup
        Task::future(async {
          let result = version_check::check_for_updates().await;
          UIMessage::VersionCheckResult(result)
        }),
      ]),
    )
  }

  fn update(&mut self, message: UIMessage) -> Task<UIMessage> {
    // println!("UI update: {:?}", message);
    match message {
      UIMessage::RerenderUI => Task::none(),
      UIMessage::SetScript(script_display) => {
        // Get current options before creating new context
        let current_options = {
          let ctx = self.global_app_state.typing_context.lock().unwrap();
          Some(lipilekhika::typing::TypingContextOptions {
            auto_context_clear_time_ms: lipilekhika::typing::DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS,
            use_native_numerals: ctx.get_use_native_numerals(),
            include_inherent_vowel: ctx.get_include_inherent_vowel(),
          })
        };

        let script_name = script_display.script_name.as_str();
        let new_script_context = TypingContext::new(script_name, current_options);
        if let Ok(new_script_context) = new_script_context {
          {
            let mut ctx = self.global_app_state.typing_context.lock().unwrap();
            *ctx = new_script_context;
          }
          // Update persistent state and save asynchronously
          {
            let mut state = self.global_app_state.persitent_state.lock().unwrap();
            state.script = script_display.script_name.clone();
          }
          let _ = self.tx_tray.lock().unwrap().send(ThreadMessage {
            origin: ThreadMessageOrigin::UI,
            msg: ThreadMessageType::RerenderTray,
          });
          // Return async save task
          Self::save_persistent_state_async(Arc::clone(&self.global_app_state))
        } else {
          Task::none()
        }
      }
      UIMessage::ToggleTypingMode(enabled) => {
        self
          .global_app_state
          .typing_enabled
          .store(enabled, Ordering::SeqCst);
        let _ = self.tx_tray.lock().unwrap().send(ThreadMessage {
          origin: ThreadMessageOrigin::UI,
          msg: ThreadMessageType::RerenderTray,
        });
        Task::none()
      }
      UIMessage::KeyboardToggleTypingMode => {
        // Toggle typing mode (flip current state)
        let current = self.global_app_state.typing_enabled.load(Ordering::SeqCst);
        self
          .global_app_state
          .typing_enabled
          .store(!current, Ordering::SeqCst);
        let _ = self.tx_tray.lock().unwrap().send(ThreadMessage {
          origin: ThreadMessageOrigin::UI,
          msg: ThreadMessageType::RerenderTray,
        });
        // Trigger notification after toggling
        self.update(UIMessage::TriggerTypingNotification)
      }
      UIMessage::ToogleUseNativeNumerals(use_native_numerals) => {
        {
          self
            .global_app_state
            .typing_context
            .lock()
            .unwrap()
            .update_use_native_numerals(use_native_numerals);
        }
        // Update persistent state and save asynchronously
        {
          let mut state = self.global_app_state.persitent_state.lock().unwrap();
          state.native_numerals = use_native_numerals;
        }
        let _ = self.tx_tray.lock().unwrap().send(ThreadMessage {
          origin: ThreadMessageOrigin::UI,
          msg: ThreadMessageType::RerenderTray,
        });
        // Return async save task
        Self::save_persistent_state_async(Arc::clone(&self.global_app_state))
      }
      UIMessage::ToogleIncludeInherentVowel(include_inherent_vowel) => {
        {
          self
            .global_app_state
            .typing_context
            .lock()
            .unwrap()
            .update_include_inherent_vowel(include_inherent_vowel);
        }
        // Update persistent state and save asynchronously
        {
          let mut state = self.global_app_state.persitent_state.lock().unwrap();
          state.inherent_vowel = include_inherent_vowel;
        }
        let _ = self.tx_tray.lock().unwrap().send(ThreadMessage {
          origin: ThreadMessageOrigin::UI,
          msg: ThreadMessageType::RerenderTray,
        });
        // Return async save task
        Self::save_persistent_state_async(Arc::clone(&self.global_app_state))
      }
      UIMessage::TriggerTypingNotification => {
        let enabled = self.global_app_state.typing_enabled.load(Ordering::SeqCst);
        // Show notification based on typing state
        let msg = if enabled {
          "Typing : On".to_string()
        } else {
          "Typing : Off".to_string()
        };
        self.notification_message = msg.clone();

        // Close existing notification if any, then open new one
        let close_task = if let Some(old_id) = self.notification_window.take() {
          window::close(old_id)
        } else {
          Task::none()
        };

        let (new_id, open_task) = notification::open_notification_window();
        self.notification_window = Some(new_id);

        // Start timeout timer
        let timeout_task = notification::notification_timeout(
          &self.notification_config,
          UIMessage::CloseNotification(new_id),
        );

        Task::batch([
          close_task,
          open_task.map(UIMessage::NotificationOpened),
          timeout_task,
        ])
      }
      UIMessage::NotificationOpened(_id) => {
        // Window is already tracked, nothing more to do
        Task::none()
      }
      UIMessage::CloseNotification(id) => {
        if self.notification_window == Some(id) {
          self.notification_window = None;
          window::close(id)
        } else {
          Task::none()
        }
      }
      UIMessage::WindowClosed(id) => {
        // Window was actually closed (programmatically or otherwise)
        if self.main_window == Some(id) {
          // Main window closed - mark as minimized to tray
          self.main_window = None;
        } else if self.notification_window == Some(id) {
          // Clean up notification window
          self.notification_window = None;
        } else if self.typing_helper_window == Some(id) {
          // Clean up typing helper window
          self.typing_helper_window = None;
        }
        Task::none()
      }
      UIMessage::WindowCloseRequested(id) => {
        // User clicked X button - exit the entire application
        if self.main_window == Some(id) {
          iced::exit()
        } else if self.notification_window == Some(id) {
          // Just close notification window
          self.notification_window = None;
          window::close(id)
        } else if self.typing_helper_window == Some(id) {
          // Close typing helper window
          self.typing_helper_window = None;
          window::close(id)
        } else {
          Task::none()
        }
      }
      UIMessage::MinimizeBackground => {
        // Close the main window to hide from taskbar (minimize to tray)
        if let Some(id) = self.main_window {
          window::close(id)
        } else {
          Task::none()
        }
      }
      UIMessage::MaximizeUI => {
        // Re-open the main window if it was closed/minimized to tray
        if self.main_window.is_none() {
          let (new_id, open_task) = window::open(window::Settings {
            icon: Some(self.window_icon.clone()),
            resizable: false,
            size: iced::Size::new(DIMS[0], DIMS[1]),
            position: window::Position::Centered,
            exit_on_close_request: false,
            ..Default::default()
          });
          self.main_window = Some(new_id);
          // Return the open task and focus the window
          Task::batch([open_task.discard(), window::gain_focus(new_id)])
        } else if let Some(id) = self.main_window {
          // Window exists but might be minimized, restore and focus
          Task::batch([window::minimize(id, false), window::gain_focus(id)])
        } else {
          Task::none()
        }
      }
      UIMessage::CloseApp => {
        // Exit the application (triggered by Win+Esc shortcut)
        iced::exit()
      }
      UIMessage::OpenAbout => {
        self.about_modal_open = true;
        Task::none()
      }
      UIMessage::CloseAbout => {
        self.about_modal_open = false;
        Task::none()
      }
      UIMessage::OpenLipiParivartaka => {
        // Launch lipiparivartaka.exe
        // Try to find the executable in various locations
        let exe_paths = [
          // Current directory
          PathBuf::from("lipiparivartaka.exe"),
          // Relative to current exe directory
          env::current_exe()
            .unwrap_or_default()
            .parent()
            .unwrap_or(&PathBuf::new())
            .join("lipiparivartaka.exe"),
          // In lipiparivartaka/src-tauri/target/release
          PathBuf::from("lipiparivartaka")
            .join("src-tauri")
            .join("target")
            .join("release")
            .join("lipiparivartaka.exe"),
          // In lipiparivartaka/src-tauri/target/debug
          PathBuf::from("lipiparivartaka")
            .join("src-tauri")
            .join("target")
            .join("debug")
            .join("lipiparivartaka.exe"),
        ];

        for exe_path in &exe_paths {
          if exe_path.exists() {
            let _ = Command::new(exe_path).spawn();
            break;
          }
        }

        Task::none()
      }
      UIMessage::OpenGitHub => {
        // Open GitHub repository in default browser
        let _ = Command::new("cmd")
          .args(["/C", "start", "https://github.com/shubhattin/lipilekhika"])
          .spawn();
        Task::none()
      }
      UIMessage::OpenWebsite => {
        // Open website in default browser
        let _ = Command::new("cmd")
          .args(["/C", "start", "https://lipilekhika.in"])
          .spawn();
        Task::none()
      }
      UIMessage::ToggleInherentVowelInfo => {
        self.inherent_vowel_info_open = !self.inherent_vowel_info_open;
        Task::none()
      }
      UIMessage::CloseInherentVowelInfo => {
        self.inherent_vowel_info_open = false;
        Task::none()
      }
      UIMessage::OpenTypingHelper => {
        // Don't open if already open
        if self.typing_helper_window.is_some() {
          // Focus the existing window
          if let Some(id) = self.typing_helper_window {
            return window::gain_focus(id);
          }
          return Task::none();
        }

        // Sync script from current context
        let curr_script = {
          let ctx = self.global_app_state.typing_context.lock().unwrap();
          ctx.get_normalized_script()
        };
        self.typing_helper_state.current_script = curr_script;

        let (new_id, open_task) = open_typing_helper_window(Some(self.window_icon.clone()));
        self.typing_helper_window = Some(new_id);
        open_task.map(UIMessage::TypingHelperOpened)
      }
      UIMessage::OpenTypingHelperCompare => {
        // Don't open if already open
        if self.typing_helper_window.is_some() {
          // Focus the existing window and switch to Compare Scripts tab
          if let Some(id) = self.typing_helper_window {
            self.typing_helper_state.active_tab = TypingHelperTab::CompareScripts;
            return window::gain_focus(id);
          }
          return Task::none();
        }

        // Sync script from current context
        let curr_script = {
          let ctx = self.global_app_state.typing_context.lock().unwrap();
          ctx.get_normalized_script()
        };
        self.typing_helper_state.current_script = curr_script;
        // Set active tab to Compare Scripts
        self.typing_helper_state.active_tab = TypingHelperTab::CompareScripts;

        let (new_id, open_task) = open_typing_helper_window(Some(self.window_icon.clone()));
        self.typing_helper_window = Some(new_id);
        open_task.map(UIMessage::TypingHelperOpened)
      }
      UIMessage::TypingHelperOpened(_id) => {
        // Window is tracked, nothing more to do
        Task::none()
      }
      UIMessage::TypingHelper(msg) => {
        match msg {
          TypingHelperMessage::SetScript(script_display) => {
            self.typing_helper_state.current_script = script_display.script_name;
          }
          TypingHelperMessage::SetTab(tab) => {
            self.typing_helper_state.active_tab = tab;
          }
          TypingHelperMessage::SetCompareScript(script_display) => {
            self.typing_helper_state.compare_script = Some(script_display);
          }
        }
        Task::none()
      }
      UIMessage::VersionCheckResult(result) => {
        self.version_check_result = Some(result);
        Task::none()
      }
      UIMessage::UpdateApp => {
        // Prevent multiple presses
        if self.update_in_progress {
          return Task::none();
        }
        // Download and install the update asynchronously
        if let Some(ref result) = self.version_check_result {
          if let (Some(url), Some(version)) = (
            result.windows_msi_download_url.clone(),
            result.latest_version.clone(),
          ) {
            self.update_in_progress = true;
            return Task::future(async move {
              let result = version_check::download_and_install_update(url, version).await;
              UIMessage::UpdateAppResult(result)
            });
          }
        }
        Task::none()
      }
      UIMessage::UpdateAppResult(result) => {
        match result {
          UpdateResult::InstallerLaunched => {
            // Installer launched successfully, exit the app
            return iced::exit();
          }
          UpdateResult::DownloadFailed(err) => {
            eprintln!("Update download failed: {}", err);
            self.update_in_progress = false; // Re-enable button on failure
          }
          UpdateResult::LaunchFailed(err) => {
            eprintln!("Installer launch failed: {}", err);
            self.update_in_progress = false; // Re-enable button on failure
          }
          UpdateResult::NoUpdateUrl => {
            eprintln!("No update URL available");
            self.update_in_progress = false; // Re-enable button on failure
          }
        }
        Task::none()
      }
      UIMessage::DismissUpdateNotification => {
        self.update_notification_dismissed = true;
        Task::none()
      }
    }
  }

  fn subscription(&self) -> Subscription<UIMessage> {
    Subscription::batch([
      Subscription::run_with(ThreadRx::new(Arc::clone(&self.rx)), thread_message_stream),
      // Listen for user clicking X button (to exit app)
      window::close_requests().map(UIMessage::WindowCloseRequested),
      // Listen for actual window closes (to track programmatic closes)
      window::close_events().map(UIMessage::WindowClosed),
      // Listen for keyboard shortcuts
      keyboard::listen().filter_map(|event| {
        if let keyboard::Event::KeyPressed { key, modifiers, .. } = event {
          // Alt+X or Alt+C: Toggle typing mode
          if modifiers.alt() && !modifiers.control() && !modifiers.logo() && !modifiers.shift() {
            if let Key::Character(ref c) = key {
              let c_lower = c.to_lowercase();
              if c_lower == "x" || c_lower == "c" {
                // Toggle typing mode and trigger notification
                return Some(UIMessage::KeyboardToggleTypingMode);
              }
            }
          }
          // Win+Esc: Close the application
          if modifiers.logo() && !modifiers.alt() && !modifiers.control() && !modifiers.shift() {
            if key == Key::Named(Named::Escape) {
              return Some(UIMessage::CloseApp);
            }
          }
        }
        None
      }),
    ])
  }

  fn view(&self, window_id: window::Id) -> Element<'_, UIMessage> {
    if Some(window_id) == self.notification_window {
      // Render notification view
      notification::view_notification(&self.notification_message)
    } else if Some(window_id) == self.typing_helper_window {
      // Render typing helper view
      view_typing_helper(&self.typing_helper_state)
    } else {
      // Render main app view
      let scripts = get_ordered_script_list();
      let scripts: Vec<ScriptDisplay> = scripts
        .into_iter()
        .filter(|s| s.script_name != "Normal")
        .collect();

      let typing_enabled = self.global_app_state.typing_enabled.load(Ordering::SeqCst);

      let (use_native_numerals, include_inherent_vowel, curr_script) = {
        let ctx = self.global_app_state.typing_context.lock().unwrap();
        (
          ctx.get_use_native_numerals(),
          ctx.get_include_inherent_vowel(),
          ctx.get_normalized_script(),
        )
        // auto drops lock
      };

      // Find the ScriptDisplay that matches the current script
      let current_script_display = scripts
        .iter()
        .find(|sd| sd.script_name == curr_script)
        .cloned();

      let main_content = container(column![
        row![
          {
            let more_menu = Item::with_menu(
              container(
                svg(iced::widget::svg::Handle::from_memory(include_bytes!(
                  "../../assets/menu.svg"
                )))
                .width(Length::Fixed(28.0))
                .height(Length::Fixed(28.0))
                .style(|theme: &Theme, status: iced::widget::svg::Status| {
                  iced::widget::svg::Style {
                    color: match status {
                      iced::widget::svg::Status::Hovered => Some(theme.palette().primary),
                      _ => Some(theme.palette().text),
                    },
                  }
                }),
              )
              .padding(4),
              Menu::new(vec![
                Item::new(
                  button(
                    row![
                      svg(iced::widget::svg::Handle::from_memory(include_bytes!(
                        "../../assets/about.svg"
                      )))
                      .width(Length::Fixed(26.0))
                      .height(Length::Fixed(26.0)),
                      text("About")
                    ]
                    .spacing(8)
                    .align_y(iced::Alignment::Center),
                  )
                  .width(Length::Fill)
                  .on_press(UIMessage::OpenAbout)
                  .style(
                    |theme: &Theme, status: iced::widget::button::Status| {
                      let palette = theme.extended_palette();
                      iced::widget::button::Style {
                        background: Some(iced::Background::Color(match status {
                          iced::widget::button::Status::Hovered => palette.background.weak.color,
                          _ => iced::Color::TRANSPARENT,
                        })),
                        text_color: palette.background.base.text,
                        border: iced::Border::default(),
                        shadow: iced::Shadow::default(),
                        snap: false,
                      }
                    },
                  ),
                ),
                Item::new(
                  button(
                    row![
                      image(iced::widget::image::Handle::from_bytes(
                        include_bytes!("../../assets/icon.png").to_vec(),
                      ))
                      .width(Length::Fixed(20.0))
                      .height(Length::Fixed(20.0)),
                      text("Lipi Parivartaka")
                    ]
                    .spacing(8)
                    .align_y(iced::Alignment::Center),
                  )
                  .width(Length::Fill)
                  .on_press(UIMessage::OpenLipiParivartaka)
                  .style(
                    |theme: &Theme, status: iced::widget::button::Status| {
                      let palette = theme.extended_palette();
                      iced::widget::button::Style {
                        background: Some(iced::Background::Color(match status {
                          iced::widget::button::Status::Hovered => palette.background.weak.color,
                          _ => iced::Color::TRANSPARENT,
                        })),
                        text_color: palette.background.base.text,
                        border: iced::Border::default(),
                        shadow: iced::Shadow::default(),
                        snap: false,
                      }
                    },
                  ),
                ),
              ])
              .max_width(180.0),
            );
            MenuBar::new(vec![more_menu]).style(|theme: &Theme, _status| {
              let palette = theme.extended_palette();
              iced_aw::menu::Style {
                bar_background: iced::Background::Color(iced::Color::TRANSPARENT),
                bar_border: iced::Border::default(),
                bar_shadow: iced::Shadow::default(),
                menu_background: iced::Background::Color(palette.background.base.color),
                menu_border: iced::Border {
                  color: palette.background.strong.color,
                  width: 1.0,
                  radius: 4.0.into(),
                },
                menu_shadow: iced::Shadow::default(),
                path: iced::Background::Color(iced::Color::TRANSPARENT),
                path_border: iced::Border::default(),
              }
            })
          },
          Space::new().width(Length::Fill),
          pick_list(scripts, current_script_display, UIMessage::SetScript)
            .width(Length::Fixed(200.0)),
          Space::new().width(Length::Fill),
          tooltip(
            mouse_area(
              svg(iced::widget::svg::Handle::from_memory(include_bytes!(
                "../../assets/minimize.svg"
              )))
              .width(Length::Fixed(26.0))
              .height(Length::Fixed(26.0))
              .style(
                |theme: &Theme, status: iced::widget::svg::Status| iced::widget::svg::Style {
                  color: match status {
                    iced::widget::svg::Status::Hovered => Some(theme.palette().primary),
                    _ => Some(theme.palette().text),
                  },
                }
              )
            )
            .on_press(UIMessage::MinimizeBackground)
            .interaction(mouse::Interaction::Pointer),
            "Minimize to Taskbar",
            tooltip::Position::Bottom,
          )
          .style(|theme: &Theme| {
            let palette = theme.extended_palette();
            container::Style {
              background: Some(iced::Background::Color(palette.background.strong.color)),
              border: iced::Border {
                color: palette.background.base.text,
                width: 1.0,
                radius: 4.0.into(),
              },
              shadow: iced::Shadow {
                color: iced::Color::from_rgba(0.0, 0.0, 0.0, 0.3),
                offset: iced::Vector::new(0.0, 2.0),
                blur_radius: 4.0,
              },
              text_color: Some(palette.background.base.text),
              snap: false,
            }
          }),
        ],
        row![
          toggler(typing_enabled)
            .label("Typing")
            .on_toggle(UIMessage::ToggleTypingMode),
          text("Alt+X/C")
            .style(|theme: &Theme| iced::widget::text::Style {
              color: Some(theme.extended_palette().background.weak.text),
            })
            .center()
            .size(12),
        ]
        .padding([12, 0])
        .spacing(20),
        // row![
        //   pick_list(scripts, current_script_display, UIMessage::SetScript)
        //     .width(Length::Fixed(200.0))
        // ]
        // .padding([8, 0]),
        row![
          checkbox(use_native_numerals)
            .on_toggle(UIMessage::ToogleUseNativeNumerals)
            .label("Native Numerals"),
          row![
            checkbox(include_inherent_vowel)
              .on_toggle(UIMessage::ToogleIncludeInherentVowel)
              .label("Inherent Vowel"),
            mouse_area(
              svg(iced::widget::svg::Handle::from_memory(include_bytes!(
                "../../assets/info.svg"
              )))
              .width(Length::Fixed(16.0))
              .height(Length::Fixed(16.0))
              .style(|theme: &Theme, status: iced::widget::svg::Status| {
                iced::widget::svg::Style {
                  color: match status {
                    iced::widget::svg::Status::Hovered => Some(theme.palette().primary),
                    _ => Some(theme.extended_palette().background.weak.text),
                  },
                }
              }),
            )
            .on_press(UIMessage::ToggleInherentVowelInfo)
            .interaction(mouse::Interaction::Pointer)
          ]
          .spacing(4)
          .align_y(iced::Alignment::Center),
        ]
        .spacing(20)
        .padding([12, 0]),
        row![
          // Typing Help button
          button(
            row![
              svg(iced::widget::svg::Handle::from_memory(include_bytes!(
                "../../assets/keyboard.svg"
              )))
              .width(Length::Fixed(20.0))
              .height(Length::Fixed(20.0))
              .style(|theme: &Theme, _status: iced::widget::svg::Status| {
                iced::widget::svg::Style {
                  color: Some(theme.palette().text),
                }
              }),
              text("Typing Help").size(17),
            ]
            .spacing(6)
            .align_y(iced::Alignment::Center),
          )
          .on_press(UIMessage::OpenTypingHelper)
          .style(|theme: &Theme, status: iced::widget::button::Status| {
            let palette = theme.extended_palette();
            iced::widget::button::Style {
              background: Some(iced::Background::Color(match status {
                iced::widget::button::Status::Hovered => palette.background.weak.color,
                _ => iced::Color::TRANSPARENT,
              })),
              text_color: palette.background.base.text,
              border: iced::Border {
                color: palette.background.strong.color,
                width: 1.0,
                radius: 4.0.into(),
              },
              shadow: iced::Shadow::default(),
              snap: false,
            }
          }),
          // Compare Scripts button
          button(
            row![
              svg(iced::widget::svg::Handle::from_memory(include_bytes!(
                "../../assets/arrow_left_right.svg"
              )))
              .width(Length::Fixed(20.0))
              .height(Length::Fixed(20.0))
              .style(|theme: &Theme, _status: iced::widget::svg::Status| {
                iced::widget::svg::Style {
                  color: Some(theme.palette().text),
                }
              }),
              text("Compare Scripts").size(17),
            ]
            .spacing(6)
            .align_y(iced::Alignment::Center),
          )
          .on_press(UIMessage::OpenTypingHelperCompare)
          .style(|theme: &Theme, status: iced::widget::button::Status| {
            let palette = theme.extended_palette();
            iced::widget::button::Style {
              background: Some(iced::Background::Color(match status {
                iced::widget::button::Status::Hovered => palette.background.weak.color,
                _ => iced::Color::TRANSPARENT,
              })),
              text_color: palette.background.base.text,
              border: iced::Border {
                color: palette.background.strong.color,
                width: 1.0,
                radius: 4.0.into(),
              },
              shadow: iced::Shadow::default(),
              snap: false,
            }
          })
        ]
        .spacing(25)
        .padding([10, 0]),
        // Update notification (redesigned)
        {
          let notification: Element<'_, UIMessage> =
            if let Some(ref result) = self.version_check_result {
              if result.update_available && !self.update_notification_dismissed {
                if let Some(ref version) = result.latest_version {
                  row![
                    text("New Version Available :").size(13),
                    // Green update button (disabled while updating)
                    {
                      let is_updating = self.update_in_progress;
                      let button_text = if is_updating {
                        "Updating...".to_string()
                      } else {
                        format!("Update v{}", version)
                      };
                      let mut btn = button(
                        row![
                          svg(iced::widget::svg::Handle::from_memory(include_bytes!(
                            "../../assets/update.svg"
                          )))
                          .width(Length::Fixed(15.0))
                          .height(Length::Fixed(15.0))
                          .style(
                            move |_theme: &Theme, _status: iced::widget::svg::Status| {
                              iced::widget::svg::Style {
                                color: Some(if is_updating {
                                  iced::Color::from_rgba(1.0, 1.0, 1.0, 0.5)
                                } else {
                                  iced::Color::WHITE
                                }),
                              }
                            }
                          ),
                          text(button_text).size(13),
                        ]
                        .spacing(4)
                        .align_y(iced::Alignment::Center),
                      )
                      .padding([4, 12])
                      .style(
                        move |_: &Theme, status: iced::widget::button::Status| {
                          if is_updating {
                            // Disabled style
                            iced::widget::button::Style {
                              background: Some(iced::Background::Color(iced::Color::from_rgb(
                                0.4, 0.5, 0.4,
                              ))),
                              text_color: iced::Color::from_rgba(1.0, 1.0, 1.0, 0.5),
                              border: iced::Border {
                                color: iced::Color::from_rgb(0.35, 0.45, 0.35),
                                width: 1.0,
                                radius: 4.0.into(),
                              },
                              shadow: iced::Shadow::default(),
                              snap: false,
                            }
                          } else {
                            // Normal style
                            iced::widget::button::Style {
                              background: Some(iced::Background::Color(match status {
                                iced::widget::button::Status::Hovered => {
                                  iced::Color::from_rgb(0.15, 0.55, 0.25)
                                }
                                _ => iced::Color::from_rgb(0.2, 0.6, 0.3),
                              })),
                              text_color: iced::Color::WHITE,
                              border: iced::Border {
                                color: iced::Color::from_rgb(0.15, 0.5, 0.25),
                                width: 1.0,
                                radius: 4.0.into(),
                              },
                              shadow: iced::Shadow::default(),
                              snap: false,
                            }
                          }
                        },
                      );
                      if !is_updating {
                        btn = btn.on_press(UIMessage::UpdateApp);
                      }
                      btn
                    },
                    // Later button (ghost style)
                    button(text("Later").size(13))
                      .on_press(UIMessage::DismissUpdateNotification)
                      .padding([4, 12])
                      .style(|theme: &Theme, status: iced::widget::button::Status| {
                        let palette = theme.extended_palette();
                        iced::widget::button::Style {
                          background: Some(iced::Background::Color(match status {
                            iced::widget::button::Status::Hovered => palette.background.weak.color,
                            _ => iced::Color::TRANSPARENT,
                          })),
                          text_color: palette.background.base.text,
                          border: iced::Border {
                            color: palette.background.strong.color,
                            width: 1.0,
                            radius: 4.0.into(),
                          },
                          shadow: iced::Shadow::default(),
                          snap: false,
                        }
                      }),
                  ]
                  .padding(Padding {
                    top: 10.0,
                    bottom: 0.0,
                    left: 0.0,
                    right: 0.0,
                  })
                  .spacing(10)
                  .align_y(iced::Alignment::Center)
                  .into()
                } else {
                  Space::new().height(0).into()
                }
              } else {
                Space::new().height(0).into()
              }
            } else {
              Space::new().height(0).into()
            };
          notification
        }
      ])
      .padding([7, 10]);

      if self.about_modal_open {
        let about_modal = container(
          column![
            // Header with icon and title
            row![
              image(iced::widget::image::Handle::from_bytes(
                include_bytes!("../../assets/icon.png").to_vec(),
              ))
              .width(Length::Fixed(32.0))
              .height(Length::Fixed(32.0)),
              column![
                text("Lipi Lekhika").size(18),
                text(format!("v{}", env!("CARGO_PKG_VERSION")))
                  .size(11)
                  .style(|theme: &Theme| iced::widget::text::Style {
                    color: Some(theme.extended_palette().background.weak.text),
                  }),
              ]
              .spacing(2)
            ]
            .spacing(8)
            .align_y(iced::Alignment::Center),
            // Description
            text("Type Indian Languages with full Speed and Accuracy")
              .size(12)
              .center(),
            // Links row
            row![
              // GitHub button
              tooltip(
                mouse_area(
                  svg(iced::widget::svg::Handle::from_memory(include_bytes!(
                    "../../assets/github.svg"
                  )))
                  .width(Length::Fixed(22.0))
                  .height(Length::Fixed(22.0))
                  .style(|theme: &Theme, status: iced::widget::svg::Status| {
                    iced::widget::svg::Style {
                      color: match status {
                        iced::widget::svg::Status::Hovered => Some(theme.palette().primary),
                        _ => Some(theme.palette().text),
                      },
                    }
                  },),
                )
                .on_press(UIMessage::OpenGitHub)
                .interaction(mouse::Interaction::Pointer),
                "Open GitHub",
                tooltip::Position::Bottom,
              )
              .style(|theme: &Theme| {
                let palette = theme.extended_palette();
                container::Style {
                  background: Some(iced::Background::Color(palette.background.strong.color)),
                  border: iced::Border {
                    color: palette.background.base.text,
                    width: 1.0,
                    radius: 4.0.into(),
                  },
                  shadow: iced::Shadow {
                    color: iced::Color::from_rgba(0.0, 0.0, 0.0, 0.3),
                    offset: iced::Vector::new(0.0, 2.0),
                    blur_radius: 4.0,
                  },
                  text_color: Some(palette.background.base.text),
                  snap: false,
                }
              }),
              // Website link
              mouse_area(text("lipilekhika.in").size(12).style(|theme: &Theme| {
                iced::widget::text::Style {
                  color: Some(theme.palette().primary),
                }
              }))
              .on_press(UIMessage::OpenWebsite)
              .interaction(mouse::Interaction::Pointer),
            ]
            .spacing(15)
            .align_y(iced::Alignment::Center),
            // Update available indicator
            {
              let update_element: Element<'_, UIMessage> =
                if let Some(ref result) = self.version_check_result {
                  if result.update_available {
                    if let Some(ref version) = result.latest_version {
                      mouse_area(
                        container(
                          row![
                            svg(iced::widget::svg::Handle::from_memory(include_bytes!(
                              "../../assets/update.svg"
                            )))
                            .width(Length::Fixed(14.0))
                            .height(Length::Fixed(14.0))
                            .style(
                              |_theme: &Theme, _status: iced::widget::svg::Status| {
                                iced::widget::svg::Style {
                                  color: Some(iced::Color::WHITE),
                                }
                              }
                            ),
                            text(format!("Update available: v{}", version))
                              .size(11)
                              .style(|_theme: &Theme| iced::widget::text::Style {
                                color: Some(iced::Color::WHITE),
                              }),
                          ]
                          .spacing(6)
                          .align_y(iced::Alignment::Center),
                        )
                        .padding([4, 10])
                        .style(|_theme: &Theme| container::Style {
                          background: Some(iced::Background::Color(iced::Color::from_rgb(
                            0.2, 0.6, 0.3,
                          ))),
                          border: iced::Border {
                            color: iced::Color::from_rgb(0.15, 0.5, 0.25),
                            width: 1.0,
                            radius: 4.0.into(),
                          },
                          ..Default::default()
                        }),
                      )
                      .on_press(UIMessage::UpdateApp)
                      .interaction(mouse::Interaction::Pointer)
                      .into()
                    } else {
                      Space::new().height(0).into()
                    }
                  } else {
                    Space::new().height(0).into()
                  }
                } else {
                  Space::new().height(0).into()
                };
              update_element
            },
            // Close button
            button("Close")
              .on_press(UIMessage::CloseAbout)
              .padding([4, 16])
          ]
          .spacing(6)
          .align_x(iced::Alignment::Center),
        )
        .max_width(280.0)
        .max_height(300.0)
        .padding([5, 15])
        .style(|theme: &Theme| {
          let palette = theme.extended_palette();
          container::Style {
            background: Some(iced::Background::Color(palette.background.base.color)),
            border: iced::Border {
              color: palette.background.strong.color,
              width: 1.0,
              radius: 8.0.into(),
            },
            ..Default::default()
          }
        });

        stack![
          main_content,
          mouse_area(center(opaque(about_modal))).on_press(UIMessage::CloseAbout)
        ]
        .into()
      } else if self.inherent_vowel_info_open {
        // Inherent vowel info popover
        let info_popover = container(
          column![
            text("Schwa Deletion").size(16),
            column![
              text("Controls final inherent vowel (schwa).").size(10),
              text("").size(4),
              text("rAm → राम (On)").size(14),
              text(" rAm → राम् (Off)").size(14),
            ]
          ]
          .spacing(4)
          .align_x(iced::Alignment::Start),
        )
        .padding([8, 12])
        .style(|theme: &Theme| {
          let palette = theme.extended_palette();
          container::Style {
            background: Some(iced::Background::Color(palette.background.strong.color)),
            border: iced::Border {
              color: palette.background.base.text,
              width: 1.0,
              radius: 6.0.into(),
            },
            shadow: iced::Shadow {
              color: iced::Color::from_rgba(0.0, 0.0, 0.0, 0.4),
              offset: iced::Vector::new(0.0, 3.0),
              blur_radius: 8.0,
            },
            text_color: Some(palette.background.base.text),
            snap: false,
          }
        });

        stack![
          main_content,
          mouse_area(center(opaque(info_popover))).on_press(UIMessage::CloseInherentVowelInfo)
        ]
        .into()
      } else {
        main_content.into()
      }
    }
  }

  fn title(&self, _window_id: window::Id) -> String {
    // No title for notification windows
    if self.notification_window == Some(_window_id) {
      String::new()
    } else if self.typing_helper_window == Some(_window_id) {
      "Typing Help".to_string()
    } else {
      "Lipi Lekhika".to_string()
    }
  }
}

pub fn run(
  app_state: Arc<AppState>,
  rx: Receiver<ThreadMessage>,
  tx_tray: Sender<ThreadMessage>,
) -> iced::Result {
  let icon = window::icon::from_file_data(include_bytes!("../../assets/icon.png"), None)
    .expect("icon should be valid");
  let rx = Arc::new(Mutex::new(rx));
  let tx_tray = Arc::new(Mutex::new(tx_tray));

  iced::daemon(
    move || {
      App::new(
        Arc::clone(&app_state),
        Arc::clone(&rx),
        Arc::clone(&tx_tray),
        icon.clone(),
      )
    },
    App::update,
    App::view,
  )
  .title(App::title)
  .subscription(App::subscription)
  // .theme(Theme::CatppuccinLatte)
  .theme(get_theme())
  .run()
}

fn get_theme() -> Theme {
  match detect() {
    Ok(dark_light::Mode::Light) => Theme::CatppuccinLatte,
    // Ok(dark_light::Mode::Dark) => Theme::Oxocarbon,
    // Ok(dark_light::Mode::Dark) => Theme::CatppuccinMocha,
    Ok(dark_light::Mode::Dark) => Theme::Dark,
    Ok(_) | _ => Theme::CatppuccinLatte,
  }
}
