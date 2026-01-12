use crate::ui::data::{Message, get_ordered_script_list};
use crate::ui::notification::{self, NotificationConfig};
use crate::ui::thread_receive::{ThreadRx, thread_message_stream};
use crossbeam_channel::Receiver;
use iced::{
  Element, Subscription, Task,
  widget::{checkbox, column, container, pick_list, row, toggler},
  window,
};
use lipilekhika::typing::TypingContext;
use std::sync::{Arc, Mutex, atomic::Ordering};

struct App {
  script: Option<String>,
  global_app_state: Arc<crate::AppState>,
  rx: Arc<Mutex<Receiver<crate::ThreadMessage>>>,
  // Window tracking
  main_window: window::Id,
  // Notification state
  notification_window: Option<window::Id>,
  notification_message: String,
  notification_config: NotificationConfig,
}

impl App {
  fn new(
    app_state: Arc<crate::AppState>,
    rx: Arc<Mutex<Receiver<crate::ThreadMessage>>>,
    icon: window::Icon,
  ) -> (Self, Task<Message>) {
    // Open main window since daemon mode doesn't create one automatically
    let (main_id, main_open_task) = window::open(window::Settings {
      icon: Some(icon),
      resizable: false,
      size: iced::Size::new(400.0, 200.0),
      position: window::Position::Centered,
      exit_on_close_request: false,
      ..Default::default()
    });

    (
      Self {
        global_app_state: app_state,
        script: Some("Devanagari".to_string()),
        rx,
        main_window: main_id,
        notification_window: None,
        notification_message: String::new(),
        notification_config: NotificationConfig::default(),
      },
      main_open_task.discard(),
    )
  }

  fn update(&mut self, message: Message) -> Task<Message> {
    match message {
      Message::ToggleTypingMode(enabled) => {
        self
          .global_app_state
          .typing_enabled
          .store(enabled, Ordering::SeqCst);
        Task::none()
      }
      Message::ToogleUseNativeNumerals(use_native_numerals) => {
        self
          .global_app_state
          .typing_context
          .lock()
          .unwrap()
          .update_use_native_numerals(use_native_numerals);
        Task::none()
      }
      Message::ToogleIncludeInherentVowel(include_inherent_vowel) => {
        self
          .global_app_state
          .typing_context
          .lock()
          .unwrap()
          .update_include_inherent_vowel(include_inherent_vowel);
        Task::none()
      }
      Message::TriggerTypingNotification(enabled) => {
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
      Message::SetScript(script) => {
        self.script = Some(script);
        let new_script_context = TypingContext::new(self.script.as_ref().unwrap(), None);
        if let Ok(new_script_context) = new_script_context {
          let mut val = self.global_app_state.typing_context.lock().unwrap();
          *val = new_script_context;
        }
        Task::none()
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
        // Exit the daemon when the main window is closed
        if id == self.main_window {
          iced::exit()
        } else {
          // Clean up notification window if it was closed by user
          if self.notification_window == Some(id) {
            self.notification_window = None;
          }
          Task::none()
        }
      }
    }
  }

  fn subscription(&self) -> Subscription<Message> {
    Subscription::batch([
      Subscription::run_with(ThreadRx::new(Arc::clone(&self.rx)), thread_message_stream),
      window::close_requests().map(Message::WindowClosed),
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
      let use_native_numerals = self
        .global_app_state
        .typing_context
        .lock()
        .unwrap()
        .get_use_native_numerals();
      let include_inherent_vowel = self
        .global_app_state
        .typing_context
        .lock()
        .unwrap()
        .get_include_inherent_vowel();
      container(column![
        row![
          toggler(typing_enabled)
            .label("Typing")
            .on_toggle(Message::ToggleTypingMode),
        ],
        row![pick_list(scripts, self.script.as_ref(), Message::SetScript)].padding([10, 0]),
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
      ])
      .padding(10)
      .into()
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
  rx: crossbeam_channel::Receiver<crate::ThreadMessage>,
) -> iced::Result {
  let icon = window::icon::from_file_data(include_bytes!("../../assets/icon.png"), None)
    .expect("icon should be valid");
  let rx = Arc::new(Mutex::new(rx));

  iced::daemon(
    move || App::new(Arc::clone(&app_state), Arc::clone(&rx), icon.clone()),
    App::update,
    App::view,
  )
  .title(App::title)
  .subscription(App::subscription)
  .run()
}
