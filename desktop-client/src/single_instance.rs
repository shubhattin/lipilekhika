//! One running app per user. A second start (the start menu entry again, or
//! `lipilekhika --parivartaka`) hands its request to the running app and exits: two apps would run
//! two keyboard hooks (every key typed twice) and two tray icons.
//!
//! The running app listens on a local socket (a named pipe on Windows, a unix socket elsewhere).

use crate::{StartupView, ThreadMessage, ThreadMessageOrigin, ThreadMessageType};
use crossbeam_channel::Sender;
use interprocess::local_socket::{GenericNamespaced, ListenerOptions, Stream, prelude::*};
use std::io::{BufRead as _, BufReader, Write as _};

fn socket_name() -> String {
  let user = std::env::var("USERNAME")
    .or_else(|_| std::env::var("USER"))
    .unwrap_or_default();
  let user: String = user.chars().filter(|c| c.is_ascii_alphanumeric()).collect();
  format!("lipilekhika-{user}.sock")
}

fn request_of(view: StartupView) -> &'static str {
  match view {
    StartupView::Main | StartupView::TypingHelp { .. } => "show",
    StartupView::Parivartaka => "parivartaka",
  }
}

/// Hands `view` to the app when one is running already. `true`: this start should exit.
pub fn forward_to_running_app(view: StartupView) -> bool {
  let Ok(name) = socket_name().to_ns_name::<GenericNamespaced>() else {
    return false;
  };
  let Ok(mut stream) = Stream::connect(name) else {
    return false;
  };
  stream
    .write_all(format!("{}\n", request_of(view)).as_bytes())
    .is_ok()
}

/// Listens for the requests of later starts, on a thread of its own
pub fn listen(tx_ui: Sender<ThreadMessage>) {
  let listener = socket_name()
    .to_ns_name::<GenericNamespaced>()
    .and_then(|name| {
      ListenerOptions::new()
        .name(name)
        // a socket file left by a crashed app (macOS) is replaced
        .try_overwrite(true)
        .create_sync()
    });
  let listener = match listener {
    Ok(listener) => listener,
    Err(err) => {
      eprintln!("Could not listen for other starts of the app: {err}");
      return;
    }
  };
  std::thread::spawn(move || {
    for conn in listener.incoming().filter_map(Result::ok) {
      let mut line = String::new();
      if BufReader::new(conn).read_line(&mut line).is_err() {
        continue;
      }
      let msg = match line.trim() {
        "parivartaka" => ThreadMessageType::OpenParivartaka,
        _ => ThreadMessageType::MaximizeUI,
      };
      let _ = tx_ui.send(ThreadMessage {
        origin: ThreadMessageOrigin::OtherStart,
        msg,
      });
    }
  });
}
