use crate::{ThreadMessageOrigin, ThreadMessageType, ui::data::Message};
use crossbeam_channel::{Receiver, TryRecvError};
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
            Err(TryRecvError::Empty) => None,
            Err(TryRecvError::Disconnected) => break,
          }
        };

        match thread_msg {
          Some(msg) if !matches!(msg.origin, ThreadMessageOrigin::UI) => match msg.msg {
            ThreadMessageType::RerenderUI => {
              // println!("RerenderUI");
              let _out = output.send(Message::RerenderUI).await;
              if _out.is_err() {
                break;
              }
            }
            ThreadMessageType::TriggerTypingNotification => {
              if matches!(msg.origin, ThreadMessageOrigin::KeyboardHook)
                || matches!(msg.origin, ThreadMessageOrigin::Tray)
              {
                let _out = output.send(Message::TriggerTypingNotification).await;
                if _out.is_err() {
                  break;
                }
              }
            }
            ThreadMessageType::MaximizeUI => {
              if matches!(msg.origin, ThreadMessageOrigin::Tray) {
                let _out = output.send(Message::MaximizeUI).await;
                if _out.is_err() {
                  break;
                }
              }
            }
            ThreadMessageType::CloseApp => {
              if matches!(msg.origin, ThreadMessageOrigin::KeyboardHook)
                || matches!(msg.origin, ThreadMessageOrigin::Tray)
              {
                let _out = output.send(Message::CloseApp).await;
                if _out.is_err() {
                  break;
                }
              }
            }
            _ => {}
          },
          Some(_) | None => {
            // Async sleep to avoid busy-waiting and allow other tasks to run
            smol::Timer::after(std::time::Duration::from_millis(10)).await;
          }
        }
      }
    },
  ))
}
