// ---- Virtual Key Constants ----

// Message types
pub const WM_KEYDOWN: u32 = 0x0100;
pub const WM_SYSKEYDOWN: u32 = 0x0104;

// KBDLLHOOKSTRUCT flags
// https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-kbdllhookstruct
pub const LLKHF_INJECTED_FLAG: u32 = 0x00000010;

// Mouse messages
pub const WM_LBUTTONDOWN: u32 = 0x0201;
pub const WM_RBUTTONDOWN: u32 = 0x0204;
pub const WM_MBUTTONDOWN: u32 = 0x0207;

// Letters
pub const VK_X: u32 = 0x58;

// Navigation & editing keys that should clear context
pub const VK_LEFT: u32 = 0x25;
pub const VK_UP: u32 = 0x26;
pub const VK_RIGHT: u32 = 0x27;
pub const VK_DOWN: u32 = 0x28;
pub const VK_HOME: u32 = 0x24;
pub const VK_END: u32 = 0x23;
pub const VK_PRIOR: u32 = 0x21; // Page Up
pub const VK_NEXT: u32 = 0x22; // Page Down
pub const VK_DELETE: u32 = 0x2E;
pub const VK_RETURN: u32 = 0x0D;
pub const VK_TAB: u32 = 0x09;
pub const VK_ESCAPE: u32 = 0x1B;
pub const VK_BACKSPACE: u32 = 0x08;

// Modifier keys (should pass through without processing)
pub const VK_LSHIFT: u32 = 0xA0;
pub const VK_RSHIFT: u32 = 0xA1;
pub const VK_LCONTROL: u32 = 0xA2;
pub const VK_RCONTROL: u32 = 0xA3;
pub const VK_LMENU: u32 = 0xA4; // Left Alt
pub const VK_RMENU: u32 = 0xA5; // Right Alt
pub const VK_LWIN_KEY: u32 = 0x5B;
pub const VK_RWIN_KEY: u32 = 0x5C;
pub const VK_CAPS_LOCK: u32 = 0x14; // Caps Lock (using different name to avoid conflict with VK_CAPITAL import)
pub const VK_NUMLOCK: u32 = 0x90;
pub const VK_SCROLL: u32 = 0x91; // Scroll Lock
