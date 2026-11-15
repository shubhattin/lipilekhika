//! Anonymous usage analytics (PostHog), only in the release builds: CI compiles the project key in
//! (`PC_APP_POSTHOG_KEY`), without it nothing is sent.
//!
//! Events, all with the same properties (see [`base_event`]):
//! - `app_started`: on every start of the app
//! - `app_active`: at most once a day (UTC) per install, while the app runs: the daily active
//!   users (the typing tool runs in the tray for days, so the starts don't count them)
//!
//! The install is a random id (no account, nothing personal); the person's properties (`$set`) keep
//! the OS, app and version of the last event, `$set_once` the first version installed.

use chrono::{DateTime, Utc};
use posthog_rs::{Client, Event, client};
use serde_json::json;
use std::time::Duration;
use std::{fs, path::PathBuf, thread};
use uuid::Uuid;

/// The file with the unique anonymous identifier
fn install_id_path() -> PathBuf {
  crate::persistent_state::app_data_path("install_id")
}

/// The file with the day (UTC, `YYYY-MM-DD`) `app_active` was last sent on
fn last_active_path() -> PathBuf {
  crate::persistent_state::app_data_path("analytics_last_active")
}

fn unique_anonymous_id() -> String {
  let path = install_id_path();

  if let Ok(id) = fs::read_to_string(&path) {
    let id = id.trim();
    if !id.is_empty() {
      return id.to_string();
    }
  }

  let id = Uuid::new_v4().to_string();
  let _ = fs::write(&path, &id);
  id
}

fn get_posthog_key() -> Option<String> {
  option_env!("PC_APP_POSTHOG_KEY")
    .map(str::trim)
    .filter(|k| !k.is_empty())
    .map(str::to_string)
}

/// The app: the full Lipi Lekhika, or Lipi Parivartaka on its own (the Linux build)
fn app_name() -> &'static str {
  if cfg!(feature = "typing-tool") {
    "lipilekhika"
  } else {
    "lipiparivartaka"
  }
}

/// The OS in PostHog's own names (`$os`), as its other SDKs send them
fn posthog_os() -> &'static str {
  match std::env::consts::OS {
    "windows" => "Windows",
    "macos" => "Mac OS X",
    "linux" => "Linux",
    other => other,
  }
}

/// The OS, app and settings properties of every event
struct Context {
  distinct_id: String,
  os_version: String,
  locale: Option<String>,
}

impl Context {
  fn new() -> Self {
    Context {
      distinct_id: unique_anonymous_id(),
      os_version: os_info::get().version().to_string(),
      locale: sys_locale::get_locale(),
    }
  }

  /// The event `name`, made at `at`
  fn event(&self, name: &str, at: DateTime<Utc>) -> Event {
    let mut event = Event::new(name, &self.distinct_id);
    let _ = event.set_timestamp(at);

    let version = env!("CARGO_PKG_VERSION");
    let state = crate::persistent_state::PersitentState::read_app_config();

    let props = [
      ("$os", json!(posthog_os())),
      ("$os_version", json!(self.os_version)),
      ("$app_name", json!(app_name())),
      ("$app_version", json!(version)),
      ("$locale", json!(self.locale)),
      // the same as `$os` / `$app_name` / `$app_version`, the names the earlier versions sent
      ("app", json!(app_name())),
      ("platform", json!(std::env::consts::OS)),
      ("app_version", json!(version)),
      ("arch", json!(std::env::consts::ARCH)),
      ("portable", json!(crate::portable::is_portable())),
      // the settings
      ("script", json!(state.script)),
      ("typing_status", json!(state.typing_status)),
      ("theme", json!(state.theme)),
    ];
    for (key, value) in props {
      let _ = event.insert_prop(key, value);
    }

    let _ = event.insert_prop(
      "$set",
      json!({
        "$os": posthog_os(),
        "$os_version": self.os_version,
        "app": app_name(),
        "app_version": version,
        "arch": std::env::consts::ARCH,
        "portable": crate::portable::is_portable(),
        "script": state.script,
      }),
    );
    let _ = event.insert_prop(
      "$set_once",
      json!({
        "first_app_version": version,
        "first_seen": at.to_rfc3339(),
      }),
    );
    event
  }
}

/// Sends an event, again a few times if there is no connection (the app starts with the system,
/// often before the network is up). Every try sends the time the event was made.
fn send(client: &Client, ctx: &Context, name: &str) -> bool {
  const RETRY_DELAYS: [u64; 5] = [0, 15, 60, 5 * 60, 15 * 60];
  let at = Utc::now();
  RETRY_DELAYS.iter().any(|&delay| {
    thread::sleep(Duration::from_secs(delay));
    client.capture(ctx.event(name, at)).is_ok()
  })
}

/// Today (UTC) as `YYYY-MM-DD`
fn today() -> String {
  Utc::now().format("%Y-%m-%d").to_string()
}

/// Sends `app_active` if it wasn't sent today
fn send_active_once_a_day(client: &Client, ctx: &Context) {
  let path = last_active_path();
  let today = today();
  let last = fs::read_to_string(&path).unwrap_or_default();
  if last.trim() == today {
    return;
  }
  if send(client, ctx, "app_active") {
    let _ = fs::write(&path, &today);
  }
}

/// Runs for as long as the app does (on a thread of its own): the start event, then the daily one
pub fn run_analytics() {
  let Some(key) = get_posthog_key() else {
    return; // analytics disabled
  };

  let client = client(key.as_str());
  let ctx = Context::new();

  send(&client, &ctx, "app_started");
  loop {
    send_active_once_a_day(&client, &ctx);
    thread::sleep(Duration::from_secs(60 * 60));
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn event_has_the_os_app_and_person_properties() {
    let ctx = Context {
      distinct_id: "test-install".to_string(),
      os_version: "1.2.3".to_string(),
      locale: Some("hi-IN".to_string()),
    };
    let at = Utc::now();
    let event = serde_json::to_value(ctx.event("app_started", at)).unwrap();

    assert_eq!(event["event"], "app_started");
    assert_eq!(event["$distinct_id"], "test-install");
    assert!(event["timestamp"].is_string());
    let props = &event["properties"];
    assert_eq!(props["$os"], posthog_os());
    assert_eq!(props["$os_version"], "1.2.3");
    assert_eq!(props["$app_version"], env!("CARGO_PKG_VERSION"));
    assert_eq!(props["$locale"], "hi-IN");
    assert_eq!(props["arch"], std::env::consts::ARCH);
    assert!(props["script"].is_string());
    assert_eq!(props["$set"]["app_version"], env!("CARGO_PKG_VERSION"));
    assert_eq!(props["$set_once"]["first_seen"], at.to_rfc3339());
  }
}
