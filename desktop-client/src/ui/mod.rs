use crossbeam_channel::Receiver;
use iced::{
  Element, Subscription, stream,
  widget::{column, container, pick_list, row, toggler},
  window,
};
use iced_futures::BoxStream;
use lipilekhika::{get_script_list_data, typing::create_typing_context};
use std::{
  any::TypeId,
  hash::{Hash, Hasher},
  sync::{Arc, Mutex, atomic::Ordering},
};

struct ThreadRx {
  rx: Arc<Mutex<Receiver<crate::ThreadMessage>>>,
}

impl ThreadRx {
  fn new(rx: Arc<Mutex<Receiver<crate::ThreadMessage>>>) -> Self {
    Self { rx }
  }
}

impl Hash for ThreadRx {
  fn hash<H: Hasher>(&self, state: &mut H) {
    TypeId::of::<ThreadRx>().hash(state);
    Arc::as_ptr(&self.rx).hash(state);
  }
}

struct App {
  typing_enabled: bool,
  script: Option<String>,
  global_app_state: Arc<crate::AppState>,
  rx: Arc<Mutex<Receiver<crate::ThreadMessage>>>,
}

#[derive(Clone, Debug)]
enum Message {
  ToggleTypingMode(bool),
  SetScript(String),
}

fn get_ordered_script_list() -> Vec<String> {
  let _script_list = get_script_list_data();
  let mut scripts: Vec<(String, u8)> = _script_list.scripts.clone().into_iter().collect();

  scripts.sort_by(|a, b| a.1.cmp(&b.1));

  scripts.into_iter().map(|(key, _)| key).collect()
}

fn thread_message_stream(data: &ThreadRx) -> BoxStream<Message> {
  let rx = Arc::clone(&data.rx);

  Box::pin(stream::channel(
    32,
    move |mut output: iced::futures::channel::mpsc::Sender<Message>| async move {
      use iced::futures::SinkExt;

      loop {
        let thread_msg = {
          let guard = match rx.lock() {
            Ok(lock) => lock,
            Err(_) => break,
          };

          match guard.try_recv() {
            Ok(msg) => Some(msg),
            Err(crossbeam_channel::TryRecvError::Empty) => None,
            Err(crossbeam_channel::TryRecvError::Disconnected) => break,
          }
        };

        match thread_msg {
          Some(msg) => match msg.msg {
            crate::ThreadMessageType::SetTypingEnabled(enabled) => {
              let _out = output.send(Message::ToggleTypingMode(enabled)).await;
              println!("enabled: {}, _out: {:?}", enabled, _out);
              if _out.is_err() {
                break;
              }
            }
          },
          None => {
            // Async sleep to avoid busy-waiting and allow other tasks to run
            smol::Timer::after(std::time::Duration::from_millis(10)).await;
          }
        }
      }
    },
  ))
}

impl App {
  fn update(&mut self, message: Message) {
    println!("message: {:?}", message);
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
