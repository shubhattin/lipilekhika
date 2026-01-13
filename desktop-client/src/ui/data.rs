use iced::window;
use lipilekhika::get_script_list_data;

pub fn get_ordered_script_list() -> Vec<String> {
  let _script_list = get_script_list_data();
  let mut scripts: Vec<(String, u8)> = _script_list.scripts.clone().into_iter().collect();

  scripts.sort_by(|a, b| a.1.cmp(&b.1));

  scripts.into_iter().map(|(key, _)| key).collect()
}

#[derive(Clone, Debug)]
pub enum Message {
  ToggleTypingMode(bool),
  SetScript(String),
  TriggerTypingNotification,
  NotificationOpened(window::Id),
  CloseNotification(window::Id),
  WindowClosed(window::Id),
  WindowCloseRequested(window::Id),
  ToogleUseNativeNumerals(bool),
  ToogleIncludeInherentVowel(bool),
  RerenderUI,
  MinimizeBackground,
  MaximizeUI,
  CloseApp,
  OpenAbout,
  CloseAbout,
}
