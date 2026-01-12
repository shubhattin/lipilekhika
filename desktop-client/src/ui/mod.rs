use iced::{
  Element,
  widget::{column, container, pick_list, row, toggler},
  window,
};
use lipilekhika::{get_script_list_data, typing::create_typing_context};
use std::sync::{Arc, atomic::Ordering};

struct App {
  typing_enabled: bool,
  script: Option<String>,
  global_app_state: Arc<crate::AppState>,
}

#[derive(Clone)]
enum Message {
  ToggleTypingMode(bool),
  SetScript(String),
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

  fn view(&self) -> Element<'_, Message> {
    let _script_list = get_script_list_data();
    let scripts = _script_list
      .scripts
      .keys()
      .map(|s| s.clone())
      .collect::<Vec<String>>();

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

pub fn run(app_state: Arc<crate::AppState>) -> iced::Result {
  let icon = window::icon::from_file_data(include_bytes!("../../assets/icon.png"), None)
    .expect("icon should be valid");

  iced::application(
    move || App {
      global_app_state: Arc::clone(&app_state),
      typing_enabled: false,
      script: Some("Devanagari".to_string()),
    },
    App::update,
    App::view,
  )
  .title("Lipi Lekhika")
  .window(window::Settings {
    icon: Some(icon),
    resizable: false,
    ..Default::default()
  })
  .centered()
  .window_size((400, 200))
  .run()
}
