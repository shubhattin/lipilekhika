use crate::data::{ScriptDisplay, get_ordered_script_list};
use iced::{
  Alignment, Background, Color, Element, Length, Task,
  theme::Theme,
  widget::{Space, column, container, pick_list, row, scrollable, text},
  window,
};
use iced_aw::tab_bar::{TabBar, TabLabel};
use lipilekhika::typing::{ListType, get_script_krama_data, get_script_typing_data_map};

/// Size of the Typing Helper window
pub const WINDOW_WIDTH: f32 = 700.0;
pub const WINDOW_HEIGHT: f32 = 550.0;

/// Tab selection for the Typing Helper
#[derive(Clone, Debug, PartialEq, Eq, Default, Copy)]
pub enum TypingHelperTab {
  #[default]
  TypingMap,
  CompareScripts,
}

/// State for the Typing Helper window
#[derive(Clone, Debug, Default)]
pub struct TypingHelperState {
  pub current_script: String,
  pub active_tab: TypingHelperTab,
  pub compare_script: Option<ScriptDisplay>,
}

impl TypingHelperState {
  pub fn new(script: &str) -> Self {
    let compare_script = get_ordered_script_list()
      .into_iter()
      .find(|s| s.script_name == "Romanized");

    Self {
      current_script: script.to_string(),
      active_tab: TypingHelperTab::TypingMap,
      compare_script,
    }
  }
}

/// Opens the Typing Helper window
pub fn open_typing_helper_window(icon: Option<window::Icon>) -> (window::Id, Task<window::Id>) {
  let settings = window::Settings {
    icon,
    decorations: true,
    resizable: true,
    size: iced::Size::new(WINDOW_WIDTH, WINDOW_HEIGHT),
    position: window::Position::Centered,
    exit_on_close_request: false,
    min_size: Some(iced::Size::new(500.0, 400.0)),
    ..Default::default()
  };

  window::open(settings)
}

/// Helper struct for owned typing data item
struct OwnedTypingItem {
  text: String,
  #[allow(dead_code)]
  list_type: ListType,
  mappings: Vec<String>,
}

/// Filter typing data items by category - returns owned data
fn filter_items_by_type(
  items: Vec<(String, ListType, Vec<String>)>,
  filter_type: &str,
) -> Vec<OwnedTypingItem> {
  items
    .into_iter()
    .filter(|(text, list_type, _)| {
      if text.is_empty() {
        return false;
      }
      match filter_type {
        "svara" => matches!(list_type, ListType::Svara | ListType::Matra),
        "vyanjana" => matches!(list_type, ListType::Vyanjana),
        "anya" => matches!(list_type, ListType::Anya),
        _ => false,
      }
    })
    .map(|(text, list_type, mappings)| OwnedTypingItem {
      text,
      list_type,
      mappings,
    })
    .collect()
}

/// Creates a character card for the Typing Map tab
fn typing_map_card<'a, Message: 'a>(
  char_text: String,
  mappings: Vec<String>,
) -> Element<'a, Message> {
  let char_display = if char_text == "\u{200d}" {
    text("ZWJ").size(10).color(Color::from_rgb(0.6, 0.6, 0.6))
  } else {
    text(char_text).size(22)
  };

  let mapping_badges: Vec<Element<'a, Message>> = mappings
    .into_iter()
    .map(|m| {
      container(text(m).size(12).color(Color::from_rgb(0.7, 0.7, 0.7)))
        .padding([2, 6])
        .style(|theme: &Theme| {
          let palette = theme.extended_palette();
          container::Style {
            background: Some(Background::Color(palette.background.weak.color)),
            border: iced::Border {
              color: palette.background.strong.color,
              width: 1.0,
              radius: 4.0.into(),
            },
            ..Default::default()
          }
        })
        .into()
    })
    .collect();

  let mappings_row = row(mapping_badges).spacing(4).wrap();

  container(
    column![char_display, mappings_row]
      .spacing(4)
      .align_x(Alignment::Start),
  )
  .padding([8, 12])
  .width(Length::Fill)
  .style(|theme: &Theme| {
    let palette = theme.extended_palette();
    container::Style {
      background: Some(Background::Color(palette.background.base.color)),
      border: iced::Border {
        color: palette.background.strong.color,
        width: 1.0,
        radius: 6.0.into(),
      },
      ..Default::default()
    }
  })
  .into()
}

/// Creates a character card for the Compare Scripts tab
fn compare_card<'a, Message: 'a>(base_char: String, compare_char: String) -> Element<'a, Message> {
  let base_display = if base_char.is_empty() {
    text("-").size(22).color(Color::from_rgb(0.5, 0.5, 0.5))
  } else {
    text(base_char).size(22)
  };

  let compare_display = if compare_char.is_empty() {
    text("-").size(18).color(Color::from_rgb(0.5, 0.5, 0.5))
  } else {
    text(compare_char)
      .size(18)
      .color(Color::from_rgb(0.6, 0.6, 0.6))
  };

  container(
    column![base_display, compare_display]
      .spacing(4)
      .align_x(Alignment::Start),
  )
  .padding([8, 12])
  .width(Length::Fill)
  .style(|theme: &Theme| {
    let palette = theme.extended_palette();
    container::Style {
      background: Some(Background::Color(palette.background.base.color)),
      border: iced::Border {
        color: palette.background.strong.color,
        width: 1.0,
        radius: 6.0.into(),
      },
      ..Default::default()
    }
  })
  .into()
}

/// Creates a section with a title and grid of cards
fn section<'a, Message: 'a + Clone>(
  title: &str,
  cards: Vec<Element<'a, Message>>,
) -> Element<'a, Message> {
  if cards.is_empty() {
    return Space::new().width(0).height(0).into();
  }

  let title_text = text(title.to_string()).size(16);

  // Create rows of 4 cards each
  let mut rows: Vec<Element<'a, Message>> = vec![];
  let mut current_row: Vec<Element<'a, Message>> = vec![];

  for card in cards {
    current_row.push(card);
    if current_row.len() == 4 {
      rows.push(row(std::mem::take(&mut current_row)).spacing(8).into());
    }
  }

  // Add remaining cards
  if !current_row.is_empty() {
    // Fill with empty space to maintain grid alignment
    while current_row.len() < 4 {
      current_row.push(Space::new().width(Length::Fill).into());
    }
    rows.push(row(current_row).spacing(8).into());
  }

  column![title_text, column(rows).spacing(8)]
    .spacing(10)
    .into()
}

/// Renders the Typing Map tab content
fn view_typing_map<'a, Message: 'a + Clone>(current_script: &str) -> Element<'a, Message> {
  let typing_data = match get_script_typing_data_map(current_script) {
    Ok(data) => data,
    Err(_) => {
      return container(text("Failed to load typing data...").size(14))
        .center_x(Length::Fill)
        .center_y(Length::Fill)
        .into();
    }
  };

  let svara_items = filter_items_by_type(typing_data.common_krama_map.clone(), "svara");
  let vyanjana_items = filter_items_by_type(typing_data.common_krama_map.clone(), "vyanjana");
  let anya_items = filter_items_by_type(typing_data.common_krama_map, "anya");

  let svara_cards: Vec<Element<'a, Message>> = svara_items
    .into_iter()
    .map(|item| typing_map_card(item.text, item.mappings))
    .collect();

  let vyanjana_cards: Vec<Element<'a, Message>> = vyanjana_items
    .into_iter()
    .map(|item| typing_map_card(item.text, item.mappings))
    .collect();

  let anya_cards: Vec<Element<'a, Message>> = anya_items
    .into_iter()
    .map(|item| typing_map_card(item.text, item.mappings))
    .collect();

  let script_specific_cards: Vec<Element<'a, Message>> = typing_data
    .script_specific_krama_map
    .into_iter()
    .filter(|(t, _, _)| !t.is_empty())
    .map(|(text, _, mappings)| typing_map_card(text, mappings))
    .collect();

  let content = column![
    section("Svara", svara_cards),
    section("Vyanjana", vyanjana_cards),
    section("Other", anya_cards),
    section("Script-specific Characters", script_specific_cards),
  ]
  .spacing(20)
  .padding([10, 10]);

  scrollable(content)
    .height(Length::Fill)
    .width(Length::Fill)
    .into()
}

/// Renders the Compare Scripts tab content
fn view_compare_scripts<'a, Message: 'a + Clone + From<TypingHelperMessage>>(
  state: &TypingHelperState,
  scripts: Vec<ScriptDisplay>,
) -> Element<'a, Message> {
  let current_script = state.current_script.clone();
  let current_script_label = row![
    text("Current script: ").size(13),
    text(current_script.clone()).size(13),
  ]
  .align_y(Alignment::Center);

  // Filter out current script and Normal from comparison options
  let compare_scripts: Vec<ScriptDisplay> = scripts
    .into_iter()
    .filter(|s| s.script_name != state.current_script && s.script_name != "Normal")
    .collect();

  // Validate the current compare selection against the filtered list
  let selected_compare = state.compare_script.clone().filter(|s| {
    compare_scripts
      .iter()
      .any(|c| c.script_name == s.script_name)
  });

  let compare_selector = row![
    text("Compare with ").size(13),
    pick_list(
      compare_scripts.clone(),
      selected_compare.clone(),
      |selected| { Message::from(TypingHelperMessage::SetCompareScript(selected)) }
    )
    .width(Length::Fixed(180.0)),
  ]
  .spacing(8)
  .align_y(Alignment::Center);

  let header = row![
    current_script_label,
    Space::new().width(Length::Fill),
    compare_selector,
  ]
  .spacing(20)
  .padding([0, 0]);

  let content: Element<'a, Message> = if let Some(compare_script) = selected_compare {
    // Get krama data for both scripts
    let base_krama = get_script_krama_data(&current_script).ok();
    let compare_krama = get_script_krama_data(&compare_script.script_name).ok();

    match (base_krama, compare_krama) {
      (Some(base), Some(compare)) => {
        let cards: Vec<Element<'a, Message>> = base
          .into_iter()
          .enumerate()
          .filter(|(_, (text, _))| !text.is_empty())
          .map(|(i, (base_text, _))| {
            let compare_text = compare
              .get(i)
              .map(|(t, _)| t.clone())
              .unwrap_or_else(|| "-".to_string());
            compare_card(base_text, compare_text)
          })
          .collect();

        // Create rows of 4 cards each
        let mut rows: Vec<Element<'a, Message>> = vec![];
        let mut current_row: Vec<Element<'a, Message>> = vec![];

        for card in cards {
          current_row.push(card);
          if current_row.len() == 4 {
            rows.push(row(std::mem::take(&mut current_row)).spacing(8).into());
          }
        }

        if !current_row.is_empty() {
          while current_row.len() < 4 {
            current_row.push(Space::new().width(Length::Fill).into());
          }
          rows.push(row(current_row).spacing(8).into());
        }

        column(rows).spacing(8).into()
      }
      _ => text("Failed to load krama data")
        .size(14)
        .color(Color::from_rgb(0.8, 0.3, 0.3))
        .into(),
    }
  } else {
    container(
      text("Select a script to compare against")
        .size(14)
        .color(Color::from_rgb(0.6, 0.6, 0.6)),
    )
    .center_x(Length::Fill)
    .padding(20)
    .into()
  };

  let scrollable_content = scrollable(container(content).padding([10, 10]))
    .height(Length::Fill)
    .width(Length::Fill);

  column![header, scrollable_content].spacing(10).into()
}

/// Messages for the Typing Helper
#[derive(Clone, Debug)]
pub enum TypingHelperMessage {
  SetScript(ScriptDisplay),
  SetTab(TypingHelperTab),
  SetCompareScript(ScriptDisplay),
}

/// Renders the full Typing Helper window content
pub fn view_typing_helper<'a, Message: 'a + Clone + From<TypingHelperMessage>>(
  state: &TypingHelperState,
) -> Element<'a, Message> {
  let scripts = get_ordered_script_list();

  // Find current script display
  let current_script_display = scripts
    .iter()
    .find(|sd| sd.script_name == state.current_script)
    .cloned();

  // Header with title and script selector
  let header = row![
    text("Typing help").size(18),
    Space::new().width(Length::Fill),
    text("Select Script").size(13),
    pick_list(scripts.clone(), current_script_display, |selected| {
      Message::from(TypingHelperMessage::SetScript(selected))
    })
    .width(Length::Fixed(180.0)),
  ]
  .spacing(12)
  .align_y(Alignment::Center)
  .padding([0, 0]);

  // Tab bar
  let tab_bar = TabBar::new(|tab| Message::from(TypingHelperMessage::SetTab(tab)))
    .push(
      TypingHelperTab::TypingMap,
      TabLabel::Text("Typing Map".to_string()),
    )
    .push(
      TypingHelperTab::CompareScripts,
      TabLabel::Text("Compare Scripts".to_string()),
    )
    .set_active_tab(&state.active_tab)
    .width(Length::Fill);

  // Tab content
  let tab_content: Element<'a, Message> = match state.active_tab {
    TypingHelperTab::TypingMap => view_typing_map(&state.current_script),
    TypingHelperTab::CompareScripts => view_compare_scripts(state, scripts),
  };

  container(
    column![header, tab_bar, tab_content]
      .spacing(10)
      .padding([15, 20])
      .height(Length::Fill),
  )
  .width(Length::Fill)
  .height(Length::Fill)
  .into()
}
