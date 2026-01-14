use crate::ui::data::{Message, get_ordered_script_list};
use crate::ui::notification::{self, NotificationConfig};
use crate::ui::thread_receive::{ThreadRx, thread_message_stream};
use crossbeam_channel::{Receiver, Sender};
use iced::widget::{button, center, mouse_area, opaque, stack};
use iced::{
  Element, Subscription, Task,
  widget::{checkbox, column, container, pick_list, row, text, toggler},
  window,
};
use lipilekhika::typing::TypingContext;
use std::env;
use std::path::PathBuf;
use std::process::Command;
use std::sync::{Arc, Mutex, atomic::Ordering};

struct App {
  global_app_state: Arc<crate::AppState>,
  rx: Arc<Mutex<Receiver<crate::ThreadMessage>>>,
  tx_tray: Arc<Mutex<Sender<crate::ThreadMessage>>>,
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
}

impl App {
  fn new(
    app_state: Arc<crate::AppState>,
    rx: Arc<Mutex<Receiver<crate::ThreadMessage>>>,
    tx_tray: Arc<Mutex<Sender<crate::ThreadMessage>>>,
    icon: window::Icon,
  ) -> (Self, Task<Message>) {
    // Open main window since daemon mode doesn't create one automatically
    let (main_id, main_open_task) = window::open(window::Settings {
      icon: Some(icon.clone()),
      resizable: false,
      size: iced::Size::new(400.0, 200.0),
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
      },
      main_open_task.discard(),
    )
  }

  fn update(&mut self, message: Message) -> Task<Message> {
    // println!("UI update: {:?}", message);
    match message {
      Message::RerenderUI => Task::none(),
      Message::SetScript(script) => {
        // Get current options before creating new context
        let current_options = {
          let ctx = self.global_app_state.typing_context.lock().unwrap();
          Some(lipilekhika::typing::TypingContextOptions {
            auto_context_clear_time_ms: lipilekhika::typing::DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS,
            use_native_numerals: ctx.get_use_native_numerals(),
            include_inherent_vowel: ctx.get_include_inherent_vowel(),
          })
        };

        let new_script_context = TypingContext::new(&script, current_options);
        if let Ok(new_script_context) = new_script_context {
          let mut ctx = self.global_app_state.typing_context.lock().unwrap();
          *ctx = new_script_context;
          drop(ctx);
          let _ = self.tx_tray.lock().unwrap().send(crate::ThreadMessage {
            origin: crate::ThreadMessageOrigin::UI,
            msg: crate::ThreadMessageType::RerenderTray,
          });
        }
        Task::none()
      }
      Message::ToggleTypingMode(enabled) => {
        self
          .global_app_state
          .typing_enabled
          .store(enabled, Ordering::SeqCst);
        let _ = self.tx_tray.lock().unwrap().send(crate::ThreadMessage {
          origin: crate::ThreadMessageOrigin::UI,
          msg: crate::ThreadMessageType::RerenderTray,
        });
        Task::none()
      }
      Message::ToogleUseNativeNumerals(use_native_numerals) => {
        self
          .global_app_state
          .typing_context
          .lock()
          .unwrap()
          .update_use_native_numerals(use_native_numerals);
        let _ = self.tx_tray.lock().unwrap().send(crate::ThreadMessage {
          origin: crate::ThreadMessageOrigin::UI,
          msg: crate::ThreadMessageType::RerenderTray,
        });
        Task::none()
      }
      Message::ToogleIncludeInherentVowel(include_inherent_vowel) => {
        self
          .global_app_state
          .typing_context
          .lock()
          .unwrap()
          .update_include_inherent_vowel(include_inherent_vowel);
        let _ = self.tx_tray.lock().unwrap().send(crate::ThreadMessage {
          origin: crate::ThreadMessageOrigin::UI,
          msg: crate::ThreadMessageType::RerenderTray,
        });
        Task::none()
      }
      Message::TriggerTypingNotification => {
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
          Message::CloseNotification(new_id),
        );

        Task::batch([
          close_task,
          open_task.map(Message::NotificationOpened),
          timeout_task,
        ])
      }
      Message::NotificationOpened(_id) => {
        // Window is already tracked, nothing more to do
        Task::none()
      }
      Message::CloseNotification(id) => {
        if self.notification_window == Some(id) {
          self.notification_window = None;
          window::close(id)
        } else {
          Task::none()
        }
      }
      Message::WindowClosed(id) => {
        // Window was actually closed (programmatically or otherwise)
        if self.main_window == Some(id) {
          // Main window closed - mark as minimized to tray
          self.main_window = None;
        } else if self.notification_window == Some(id) {
          // Clean up notification window
          self.notification_window = None;
        }
        Task::none()
      }
      Message::WindowCloseRequested(id) => {
        // User clicked X button - exit the entire application
        if self.main_window == Some(id) {
          iced::exit()
        } else if self.notification_window == Some(id) {
          // Just close notification window
          self.notification_window = None;
          window::close(id)
        } else {
          Task::none()
        }
      }
      Message::MinimizeBackground => {
        // Close the main window to hide from taskbar (minimize to tray)
        if let Some(id) = self.main_window {
          window::close(id)
        } else {
          Task::none()
        }
      }
      Message::MaximizeUI => {
        // Re-open the main window if it was closed/minimized to tray
        if self.main_window.is_none() {
          let (new_id, open_task) = window::open(window::Settings {
            icon: Some(self.window_icon.clone()),
            resizable: false,
            size: iced::Size::new(400.0, 200.0),
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
      Message::CloseApp => {
        // Exit the application (triggered by Win+Esc shortcut)
        iced::exit()
      }
      Message::OpenAbout => {
        self.about_modal_open = true;
        Task::none()
      }
      Message::CloseAbout => {
        self.about_modal_open = false;
        Task::none()
      }
      Message::OpenLipiParivartaka => {
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
    }
  }

  fn subscription(&self) -> Subscription<Message> {
    Subscription::batch([
      Subscription::run_with(ThreadRx::new(Arc::clone(&self.rx)), thread_message_stream),
      // Listen for user clicking X button (to exit app)
      window::close_requests().map(Message::WindowCloseRequested),
      // Listen for actual window closes (to track programmatic closes)
      window::close_events().map(Message::WindowClosed),
    ])
  }

  fn view(&self, window_id: window::Id) -> Element<'_, Message> {
    if Some(window_id) == self.notification_window {
      // Render notification view
      notification::view_notification(&self.notification_message)
    } else {
      // Render main app view
      let scripts = get_ordered_script_list();
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

      let main_content = container(column![
        row![
          toggler(typing_enabled)
            .label("Typing")
            .on_toggle(Message::ToggleTypingMode),
          text!["Alt+X/C"].size(12)
        ]
        .spacing(20),
        row![pick_list(scripts, Some(curr_script), Message::SetScript)].padding([10, 0]),
        row![
          checkbox(use_native_numerals)
            .on_toggle(Message::ToogleUseNativeNumerals)
            .label("Native Numerals"),
          checkbox(include_inherent_vowel)
            .on_toggle(Message::ToogleIncludeInherentVowel)
            .label("Inherent Vowel")
        ]
        .spacing(20)
        .padding([10, 0]),
        row![
          button("Background Minimize").on_press(Message::MinimizeBackground),
          button("About").on_press(Message::OpenAbout),
          button("Lipi Parivartaka").on_press(Message::OpenLipiParivartaka)
        ]
        .spacing(10)
        .padding([10, 0]),
      ])
      .padding(10);

      if self.about_modal_open {
        let about_modal = container(
          column![
            text("Lipi Lekhika").size(24),
            text(format!("Version: {}", env!("CARGO_PKG_VERSION"))).size(14),
            container(text("A transliteration typing tool for Indic scripts.").size(12))
              .padding([10, 0]),
            button("Close").on_press(Message::CloseAbout)
          ]
          .spacing(10)
          .align_x(iced::Alignment::Center),
        )
        .padding(20)
        .style(|_| container::Style {
          background: Some(iced::Background::Color(iced::Color::from_rgb(
            0.15, 0.15, 0.18,
          ))),
          border: iced::Border {
            color: iced::Color::from_rgb(0.3, 0.3, 0.35),
            width: 1.0,
            radius: 8.0.into(),
          },
          ..Default::default()
        });

        stack![
          main_content,
          mouse_area(center(opaque(about_modal))).on_press(Message::CloseAbout)
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
    } else {
      "Lipi Lekhika".to_string()
    }
  }
}

pub fn run(
  app_state: Arc<crate::AppState>,
  rx: Receiver<crate::ThreadMessage>,
  tx_tray: Sender<crate::ThreadMessage>,
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
  .run()
}
