use iced::{
  Alignment, Background, Color, Element, Length, Point, Size, Task,
  widget::{center, container, text},
  window,
};
use std::time::Duration;

/// Configuration for notification display
#[derive(Clone, Debug)]
pub struct NotificationConfig {
  /// Duration to show notification before auto-closing (default: 3 seconds)
  pub timeout: Duration,
}

impl Default for NotificationConfig {
  fn default() -> Self {
    Self {
      timeout: Duration::from_secs(3),
    }
  }
}

pub fn open_notification_window() -> (window::Id, Task<window::Id>) {
  let settings = window::Settings {
    decorations: false,
    resizable: false,
    level: window::Level::AlwaysOnTop,
    size: iced::Size::new(150.0, 40.0),
    position: window::Position::SpecificWith(get_top_center_position),
    exit_on_close_request: false,
    ..Default::default()
  };

  window::open(settings)
}

fn get_top_center_position(_w: Size<f32>, scr: Size<f32>) -> Point<f32> {
  Point::new(scr.width / 2.0, scr.height * 0.05)
}

pub fn notification_timeout<Message: Clone + Send + 'static>(
  config: &NotificationConfig,
  on_timeout: Message,
) -> Task<Message> {
  let timeout = config.timeout;
  Task::future(async move {
    smol::Timer::after(timeout).await;
    on_timeout
  })
}

pub fn view_notification<'a, Message: 'a>(message_text: &'a str) -> Element<'a, Message> {
  let notification_style = |_theme: &iced::Theme| container::Style {
    background: Some(Background::Color(Color::from_rgb(0.15, 0.15, 0.15))),
    border: iced::Border {
      color: Color::from_rgb(0.3, 0.3, 0.3),
      width: 1.0,
      radius: 8.0.into(),
    },
    ..Default::default()
  };

  container(
    center(
      text(message_text)
        .size(20)
        .color(Color::WHITE)
        .align_x(Alignment::Center),
    )
    .width(Length::Fill)
    .height(Length::Fill),
  )
  .style(notification_style)
  .width(Length::Fill)
  .height(Length::Fill)
  .padding(0)
  .into()
}
