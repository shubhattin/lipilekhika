use crate::ui::data::Message;
use crossbeam_channel::Receiver;
use iced::stream;
use iced_futures::BoxStream;
use std::{
  any::TypeId,
  hash::{Hash, Hasher},
  sync::{Arc, Mutex},
};

pub struct ThreadRx {
  rx: Arc<Mutex<Receiver<crate::ThreadMessage>>>,
}

impl ThreadRx {
  pub fn new(rx: Arc<Mutex<Receiver<crate::ThreadMessage>>>) -> Self {
    Self { rx }
  }
}

impl Hash for ThreadRx {
  fn hash<H: Hasher>(&self, state: &mut H) {
    TypeId::of::<ThreadRx>().hash(state);
    Arc::as_ptr(&self.rx).hash(state);
  }
}

pub fn thread_message_stream(data: &ThreadRx) -> BoxStream<Message> {
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
              if _out.is_err() {
                break;
              }
              let _out = output
                .send(Message::TriggerTypingNotification(enabled))
                .await;
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
