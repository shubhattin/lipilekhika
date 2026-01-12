use crate::ui::data::{Message, get_ordered_script_list};
use crate::ui::thread_recieve::{ThreadRx, thread_message_stream};
use crossbeam_channel::Receiver;
use iced::{
  Element, Subscription,
  widget::{column, container, pick_list, row, toggler},
  window,
};
use lipilekhika::typing::create_typing_context;
use std::sync::{Arc, Mutex, atomic::Ordering};

struct App {
  typing_enabled: bool,
  script: Option<String>,
  global_app_state: Arc<crate::AppState>,
  rx: Arc<Mutex<Receiver<crate::ThreadMessage>>>,
}

impl App {
  fn update(&mut self, message: Message) {
    match message {
      Message::ToggleTypingMode(enabled) => {
        self.typing_enabled = enabled;
        self
          .global_app_state
          .typing_enabled
          .store(enabled, Ordering::SeqCst);
      }
      Message::SetScript(script) => {
        self.script = Some(script);
        let new_script_context =
          create_typing_context(self.script.as_ref().unwrap(), None).unwrap();
        let mut val = self.global_app_state.typing_context.lock().unwrap();
        *val = new_script_context;
      }
    }
  }

  fn subscription(&self) -> Subscription<Message> {
    Subscription::run_with(ThreadRx::new(Arc::clone(&self.rx)), thread_message_stream)
  }

  fn view(&self) -> Element<'_, Message> {
    let scripts = get_ordered_script_list();
    container(column![
      row![
        toggler(self.typing_enabled)
          .label("Typing")
          .on_toggle(Message::ToggleTypingMode),
      ],
      row![pick_list(scripts, self.script.as_ref(), Message::SetScript)].padding([10, 0]),
    ])
    .padding(10)
    .into()
  }
}

pub fn run(
  app_state: Arc<crate::AppState>,
  rx: crossbeam_channel::Receiver<crate::ThreadMessage>,
) -> iced::Result {
  let icon = window::icon::from_file_data(include_bytes!("../../assets/icon.png"), None)
    .expect("icon should be valid");

  let rx = Arc::new(Mutex::new(rx));

  iced::application(
    move || App {
      global_app_state: Arc::clone(&app_state),
      typing_enabled: app_state.typing_enabled.load(Ordering::SeqCst),
      script: Some("Devanagari".to_string()),
      rx: Arc::clone(&rx),
    },
    App::update,
    App::view,
  )
  .title("Lipi Lekhika")
  .subscription(App::subscription)
  .window(window::Settings {
    icon: Some(icon),
    resizable: false,
    ..Default::default()
  })
  .centered()
  .window_size((400, 200))
  .run()
}
