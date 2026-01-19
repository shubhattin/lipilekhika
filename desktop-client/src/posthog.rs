use posthog_rs::{Event, client};
use std::time::{SystemTime, UNIX_EPOCH};
use std::{fs, path::PathBuf};
use uuid::Uuid;

fn install_id_path() -> PathBuf {
  let mut path = match dirs::data_dir() {
    Some(p) => p,
    None => return PathBuf::from("install_id"), // fallback to current dir
  };
  path.push("lipilekhika");
  fs::create_dir_all(&path).ok();
  path.push("install_id");
  // unique anonymous identifier
  path
}

fn unique_ananymouse_id() -> String {
  let path = install_id_path();

  if let Ok(id) = fs::read_to_string(&path) {
    return id.trim().to_string();
  }

  let id = Uuid::new_v4().to_string();
  let _ = fs::write(&path, &id);
  id
}

fn get_posthog_key() -> Option<String> {
  let key = option_env!("PC_APP_POSTHOG_KEY");
  key.map(|k| k.to_string())
}

pub fn init_posthog() {
  let key = match get_posthog_key() {
    Some(k) => k,
    None => return, // analytics disabled
  };

  let distinct_id = unique_ananymouse_id();

  let client = client(key.as_str());
  // sending a startup event
  let mut event = Event::new("$pageview", &distinct_id);

  // other properties
  let _ = event.insert_prop("app", "lipilekhika");
  let _ = event.insert_prop("platform", std::env::consts::OS);
  let _ = event.insert_prop("app_version", env!("CARGO_PKG_VERSION"));
  let _ = event.insert_prop(
    "started_at",
    SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .unwrap()
      .as_secs() as i64,
  );

  let _ = client.capture(event);
}
