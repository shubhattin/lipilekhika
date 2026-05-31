// macOS key codes (CGKeyCode) — re-exported from core_graphics::event::KeyCode
// for the key categories needed by the hook logic.

use core_graphics::event::KeyCode;

// Letters (toggle shortcut)
pub const VK_X: u16 = KeyCode::ANSI_X;
pub const VK_C: u16 = KeyCode::ANSI_C;

// Navigation & editing keys that clear context
pub const VK_LEFT: u16 = KeyCode::LEFT_ARROW;
pub const VK_UP: u16 = KeyCode::UP_ARROW;
pub const VK_RIGHT: u16 = KeyCode::RIGHT_ARROW;
pub const VK_DOWN: u16 = KeyCode::DOWN_ARROW;
pub const VK_HOME: u16 = KeyCode::HOME;
pub const VK_END: u16 = KeyCode::END;
pub const VK_PAGE_UP: u16 = KeyCode::PAGE_UP;
pub const VK_PAGE_DOWN: u16 = KeyCode::PAGE_DOWN;
pub const VK_FORWARD_DELETE: u16 = KeyCode::FORWARD_DELETE;
pub const VK_RETURN: u16 = KeyCode::RETURN;
pub const VK_TAB: u16 = KeyCode::TAB;
pub const VK_ESCAPE: u16 = KeyCode::ESCAPE;
pub const VK_DELETE: u16 = KeyCode::DELETE; // Backspace on macOS

// Modifier keys (pass through without processing)
pub const VK_SHIFT: u16 = KeyCode::SHIFT;
pub const VK_RIGHT_SHIFT: u16 = KeyCode::RIGHT_SHIFT;
pub const VK_CONTROL: u16 = KeyCode::CONTROL;
pub const VK_RIGHT_CONTROL: u16 = KeyCode::RIGHT_CONTROL;
pub const VK_OPTION: u16 = KeyCode::OPTION;
pub const VK_RIGHT_OPTION: u16 = KeyCode::RIGHT_OPTION;
pub const VK_COMMAND: u16 = KeyCode::COMMAND;
pub const VK_RIGHT_COMMAND: u16 = KeyCode::RIGHT_COMMAND;
pub const VK_CAPS_LOCK: u16 = KeyCode::CAPS_LOCK;
pub const VK_FUNCTION: u16 = KeyCode::FUNCTION;
