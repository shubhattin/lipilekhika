use iced::{
  Element,
  widget::{column, container, pick_list, row, toggler},
  window,
};
use lipilekhika::get_script_list_data;

struct App {
  typing_enabled: bool,
  script: Option<String>,
}

#[derive(Clone)]
enum Message {
  ToggleTypingMode(bool),
  SetScript(String),
}

impl Default for App {
  fn default() -> Self {
    Self {
      typing_enabled: false,
      script: Some("Devanagari".to_string()),
    }
  }
}

impl App {
  fn update(&mut self, message: Message) {
    match message {
      Message::ToggleTypingMode(enabled) => self.typing_enabled = enabled,
      Message::SetScript(script) => self.script = Some(script),
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

pub fn run() -> iced::Result {
  let icon = window::icon::from_file_data(include_bytes!("../../assets/icon.png"), None)
    .expect("icon should be valid");

  iced::application(|| App::default(), App::update, App::view)
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
