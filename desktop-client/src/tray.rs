use crate::AppState;
use lipilekhika::get_script_list_data;
use std::sync::{
  Arc,
  atomic::{AtomicBool, Ordering},
};
use tray_icon::{
  Icon, TrayIcon, TrayIconBuilder,
  menu::{CheckMenuItem, Menu, MenuEvent, MenuItem, PredefinedMenuItem, Submenu},
};

/// IDs for menu items - for identification in events
const MENU_ID_TYPING_ON: &str = "typing_on";
const MENU_ID_NATIVE_NUMERALS: &str = "native_numerals";
const MENU_ID_INHERENT_VOWEL: &str = "inherent_vowel";
const MENU_ID_QUIT: &str = "quit";
const MENU_ID_SCRIPT_PREFIX: &str = "script_";

pub struct TrayManager {
  _tray_icon: TrayIcon,
  app_state: Arc<AppState>,
  typing_on_item: CheckMenuItem,
  native_numerals_item: CheckMenuItem,
  inherent_vowel_item: CheckMenuItem,
  script_items: Vec<(CheckMenuItem, String)>,
}

impl TrayManager {
  /// Creates a new tray icon with all menu items.
  pub fn new(app_state: Arc<AppState>) -> Result<Self, Box<dyn std::error::Error>> {
    // Load icon from assets
    let icon_bytes = include_bytes!("../assets/icon.png");
    let icon_image = image::load_from_memory(icon_bytes)?;
    let icon_rgba = icon_image.to_rgba8();
    let (width, height) = icon_rgba.dimensions();
    let icon = Icon::from_rgba(icon_rgba.into_raw(), width, height)?;

    // Get initial state
    let typing_enabled = app_state.typing_enabled.load(Ordering::SeqCst);
    let ctx = app_state.typing_context.lock().unwrap();
    let use_native_numerals = ctx.get_use_native_numerals();
    let include_inherent_vowel = ctx.get_include_inherent_vowel();
    let current_script = ctx.get_curr_script();
    drop(ctx); // Release lock early

    // Create main menu
    let tray_menu = Menu::new();

    // Typing On/Off checkbox
    let typing_on_item =
      CheckMenuItem::with_id(MENU_ID_TYPING_ON, "Typing", true, typing_enabled, None);
    tray_menu.append(&typing_on_item)?;

    tray_menu.append(&PredefinedMenuItem::separator())?;

    // Script submenu
    let script_submenu = Submenu::new("Script", true);
    let script_list_data = get_script_list_data();
    let mut scripts: Vec<(String, u8)> = script_list_data.scripts.clone().into_iter().collect();
    scripts.sort_by(|a, b| a.1.cmp(&b.1));

    let mut script_items = Vec::new();
    for (script_name, _) in scripts {
      let item_id = format!("{}{}", MENU_ID_SCRIPT_PREFIX, script_name);
      let is_current = script_name == current_script;
      let item = CheckMenuItem::with_id(&item_id, &script_name, true, is_current, None);
      script_submenu.append(&item)?;
      script_items.push((item, script_name));
    }

    tray_menu.append(&script_submenu)?;

    tray_menu.append(&PredefinedMenuItem::separator())?;

    // Native Numerals checkbox
    let native_numerals_item = CheckMenuItem::with_id(
      MENU_ID_NATIVE_NUMERALS,
      "Native Numerals",
      true,
      use_native_numerals,
      None,
    );
    tray_menu.append(&native_numerals_item)?;

    // Inherent Vowel checkbox
    let inherent_vowel_item = CheckMenuItem::with_id(
      MENU_ID_INHERENT_VOWEL,
      "Inherent Vowel",
      true,
      include_inherent_vowel,
      None,
    );
    tray_menu.append(&inherent_vowel_item)?;

    tray_menu.append(&PredefinedMenuItem::separator())?;

    // Quit option
    let quit_item = MenuItem::with_id(MENU_ID_QUIT, "Quit", true, None);
    tray_menu.append(&quit_item)?;

    // Build tray icon with tooltip
    let tooltip = Self::generate_tooltip(&app_state);
    let tray_icon = TrayIconBuilder::new()
      .with_menu(Box::new(tray_menu))
      .with_tooltip(&tooltip)
      .with_icon(icon)
      .build()?;

    Ok(Self {
      _tray_icon: tray_icon,
      app_state,
      typing_on_item,
      native_numerals_item,
      inherent_vowel_item,
      script_items,
    })
  }

  /// Generates a tooltip string based on current state
  fn generate_tooltip(app_state: &Arc<AppState>) -> String {
    let typing_enabled = app_state.typing_enabled.load(Ordering::SeqCst);
    let ctx = app_state.typing_context.lock().unwrap();
    let current_script = ctx.get_curr_script();
    drop(ctx);

    format!(
      "Lipi Lekhika\nTyping: {}\nScript: {}",
      if typing_enabled { "On" } else { "Off" },
      current_script
    )
  }

  /// Updates the tooltip to reflect current state
  pub fn update_tooltip(&self) {
    let tooltip = Self::generate_tooltip(&self.app_state);
    self._tray_icon.set_tooltip(Some(&tooltip)).ok();
  }

  /// Handles menu events and updates the app state accordingly
  pub fn handle_menu_event(&mut self, event: MenuEvent) -> bool {
    let event_id = event.id().0.clone();

    match event_id.as_str() {
      MENU_ID_TYPING_ON => {
        let new_state = !self.app_state.typing_enabled.load(Ordering::SeqCst);
        self
          .app_state
          .typing_enabled
          .store(new_state, Ordering::SeqCst);
        self.typing_on_item.set_checked(new_state);
        self.update_tooltip();
        false
      }
      MENU_ID_NATIVE_NUMERALS => {
        let mut ctx = self.app_state.typing_context.lock().unwrap();
        let new_state = !ctx.get_use_native_numerals();
        ctx.update_use_native_numerals(new_state);
        drop(ctx);
        self.native_numerals_item.set_checked(new_state);
        false
      }
      MENU_ID_INHERENT_VOWEL => {
        let mut ctx = self.app_state.typing_context.lock().unwrap();
        let new_state = !ctx.get_include_inherent_vowel();
        ctx.update_include_inherent_vowel(new_state);
        drop(ctx);
        self.inherent_vowel_item.set_checked(new_state);
        false
      }
      MENU_ID_QUIT => {
        // Return true to signal application should quit
        true
      }
      _ => {
        // Check if it's a script selection
        if event_id.starts_with(MENU_ID_SCRIPT_PREFIX) {
          let script_name = event_id.trim_start_matches(MENU_ID_SCRIPT_PREFIX);

          // Update the typing context to use the new script
          let new_context = lipilekhika::typing::TypingContext::new(script_name, None);
          if let Ok(new_ctx) = new_context {
            let mut ctx = self.app_state.typing_context.lock().unwrap();
            *ctx = new_ctx;
            drop(ctx);

            // Update checkmarks on all script items
            for (item, name) in &self.script_items {
              let is_selected = name == script_name;
              item.set_checked(is_selected);
            }

            self.update_tooltip();
          }
        }
        false
      }
    }
  }
}

/// Runs the tray icon event loop in a separate thread
pub fn run_tray_thread(
  app_state: Arc<AppState>,
  shutdown: Arc<AtomicBool>,
) -> std::thread::JoinHandle<()> {
  std::thread::spawn(move || {
    // Create the tray icon
    let mut tray_manager = match TrayManager::new(Arc::clone(&app_state)) {
      Ok(manager) => manager,
      Err(e) => {
        eprintln!("Failed to create tray icon: {}", e);
        return;
      }
    };

    // Subscribe to menu events
    let menu_channel = MenuEvent::receiver();

    // On Windows, we need to run a Windows message loop for the tray icon to work
    #[cfg(target_os = "windows")]
    {
      use windows::Win32::UI::WindowsAndMessaging::{
        DispatchMessageW, MSG, PM_REMOVE, PeekMessageW, TranslateMessage,
      };

      let mut msg = MSG::default();
      loop {
        if shutdown.load(Ordering::SeqCst) {
          break;
        }

        // Check for menu events (non-blocking)
        while let Ok(event) = menu_channel.try_recv() {
          let should_quit = tray_manager.handle_menu_event(event);
          if should_quit {
            shutdown.store(true, Ordering::SeqCst);
            std::process::exit(0);
          }
        }

        // Process Windows messages (this is required for tray icon menu to work)
        unsafe {
          // Use PeekMessage for non-blocking message processing
          while PeekMessageW(&mut msg, None, 0, 0, PM_REMOVE).as_bool() {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
          }
        }

        // Small sleep to prevent CPU spinning
        std::thread::sleep(std::time::Duration::from_millis(10));
      }
    }

    // Non-Windows platforms fallback
    #[cfg(not(target_os = "windows"))]
    {
      loop {
        if shutdown.load(Ordering::SeqCst) {
          break;
        }

        // Check for menu events (non-blocking with timeout)
        if let Ok(event) = menu_channel.recv_timeout(std::time::Duration::from_millis(100)) {
          let should_quit = tray_manager.handle_menu_event(event);
          if should_quit {
            shutdown.store(true, Ordering::SeqCst);
            std::process::exit(0);
          }
        }
      }
    }
  })
}
