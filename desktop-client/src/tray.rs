use crate::AppState;
use crossbeam_channel::{Receiver, Sender};
use lipilekhika::get_script_list_data;
use std::collections::HashMap;
use std::sync::{
  Arc,
  atomic::{AtomicBool, Ordering},
};
use tray_icon::{
  Icon, TrayIcon, TrayIconBuilder, TrayIconEvent,
  menu::{CheckMenuItem, Menu, MenuEvent, MenuItem, PredefinedMenuItem, Submenu},
};

#[derive(Debug, Clone)]
enum TrayMenuEvent {
  TypingOn,
  NativeNumerals,
  InherentVowel,
  Quit,
  OpenApp,
  ScriptSelected(String),
}

struct MenuEventMapper {
  id_to_event: HashMap<String, TrayMenuEvent>,
}
impl MenuEventMapper {
  fn new() -> Self {
    Self {
      id_to_event: HashMap::new(),
    }
  }
  fn register(&mut self, id: String, event: TrayMenuEvent) {
    self.id_to_event.insert(id, event);
  }
  fn get_event(&self, id: &str) -> Option<&TrayMenuEvent> {
    self.id_to_event.get(id)
  }
}

/// menu item and event ids
const MENU_ID_OPEN_APP: &str = "open_app";
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
  event_mapper: MenuEventMapper,
}

impl TrayManager {
  pub fn new(app_state: Arc<AppState>) -> Result<Self, Box<dyn std::error::Error>> {
    let icon_bytes = include_bytes!("../assets/icon.png");
    let icon_image = image::load_from_memory(icon_bytes)?;
    let icon_rgba = icon_image.to_rgba8();
    let (width, height) = icon_rgba.dimensions();
    let icon = Icon::from_rgba(icon_rgba.into_raw(), width, height)?;

    let typing_enabled = app_state.typing_enabled.load(Ordering::SeqCst);
    let (use_native_numerals, include_inherent_vowel, current_script) = {
      let ctx = app_state.typing_context.lock().unwrap();
      (
        ctx.get_use_native_numerals(),
        ctx.get_include_inherent_vowel(),
        ctx.get_normalized_script(),
      )
    };
    let mut event_mapper = MenuEventMapper::new();
    let tray_menu = Menu::new();

    // Open App menu item (first item)
    let open_app_item = MenuItem::with_id(MENU_ID_OPEN_APP, "Open App", true, None);
    tray_menu.append(&open_app_item)?;
    event_mapper.register(MENU_ID_OPEN_APP.to_string(), TrayMenuEvent::OpenApp);

    tray_menu.append(&PredefinedMenuItem::separator())?;

    // Typing On/Off checkbox
    let typing_on_item =
      CheckMenuItem::with_id(MENU_ID_TYPING_ON, "Typing", true, typing_enabled, None);
    tray_menu.append(&typing_on_item)?;
    event_mapper.register(MENU_ID_TYPING_ON.to_string(), TrayMenuEvent::TypingOn);

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
      // Register event with script name as associated data
      event_mapper.register(item_id, TrayMenuEvent::ScriptSelected(script_name.clone()));
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
    event_mapper.register(
      MENU_ID_NATIVE_NUMERALS.to_string(),
      TrayMenuEvent::NativeNumerals,
    );

    // Inherent Vowel checkbox
    let inherent_vowel_item = CheckMenuItem::with_id(
      MENU_ID_INHERENT_VOWEL,
      "Inherent Vowel",
      true,
      include_inherent_vowel,
      None,
    );
    tray_menu.append(&inherent_vowel_item)?;
    event_mapper.register(
      MENU_ID_INHERENT_VOWEL.to_string(),
      TrayMenuEvent::InherentVowel,
    );

    tray_menu.append(&PredefinedMenuItem::separator())?;

    // Quit option
    let quit_item = MenuItem::with_id(MENU_ID_QUIT, "Quit", true, None);
    tray_menu.append(&quit_item)?;
    event_mapper.register(MENU_ID_QUIT.to_string(), TrayMenuEvent::Quit);

    // tooltip
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
      event_mapper,
    })
  }

  fn generate_tooltip(app_state: &Arc<AppState>) -> String {
    let typing_enabled = app_state.typing_enabled.load(Ordering::SeqCst);
    let current_script = {
      let ctx = app_state.typing_context.lock().unwrap();
      // ^ auto drops in this scope
      ctx.get_normalized_script()
    };

    format!(
      "Lipi Lekhika\nTyping: {}\nScript: {}",
      if typing_enabled { "On" } else { "Off" },
      current_script
    )
  }

  pub fn update_tooltip(&self) {
    let tooltip = Self::generate_tooltip(&self.app_state);
    self._tray_icon.set_tooltip(Some(&tooltip)).ok();
  }

  pub fn update_ui(&mut self) {
    let typing_enabled = self.app_state.typing_enabled.load(Ordering::SeqCst);

    let (use_native_numerals, include_inherent_vowel, current_script) = {
      let ctx = self.app_state.typing_context.lock().unwrap();
      (
        ctx.get_use_native_numerals(),
        ctx.get_include_inherent_vowel(),
        ctx.get_normalized_script(),
      )
    };

    self.typing_on_item.set_checked(typing_enabled);
    self.native_numerals_item.set_checked(use_native_numerals);
    self.inherent_vowel_item.set_checked(include_inherent_vowel);

    for (item, name) in &self.script_items {
      let is_selected = *name == current_script;
      item.set_checked(is_selected);
    }

    self.update_tooltip();
  }

  pub fn handle_menu_event(&mut self, event: MenuEvent) -> (bool, Vec<crate::ThreadMessageType>) {
    let event_id = event.id().0.clone();
    let mut messages = Vec::new();

    // Look up the event in our mapper
    let tray_event = match self.event_mapper.get_event(&event_id) {
      Some(evt) => evt.clone(),
      None => {
        eprintln!("Unknown menu event ID: {}", event_id);
        return (false, messages);
      }
    };

    match tray_event {
      TrayMenuEvent::TypingOn => {
        let new_state = !self.app_state.typing_enabled.load(Ordering::SeqCst);
        self
          .app_state
          .typing_enabled
          .store(new_state, Ordering::SeqCst);
        self.typing_on_item.set_checked(new_state);
        self.update_tooltip();
        messages.push(crate::ThreadMessageType::RerenderUI);
        messages.push(crate::ThreadMessageType::TriggerTypingNotification);
        (false, messages)
      }
      TrayMenuEvent::NativeNumerals => {
        let mut ctx = self.app_state.typing_context.lock().unwrap();
        let new_state = !ctx.get_use_native_numerals();
        ctx.update_use_native_numerals(new_state);
        drop(ctx);
        self.native_numerals_item.set_checked(new_state);
        messages.push(crate::ThreadMessageType::RerenderUI);
        (false, messages)
      }
      TrayMenuEvent::InherentVowel => {
        let mut ctx = self.app_state.typing_context.lock().unwrap();
        let new_state = !ctx.get_include_inherent_vowel();
        ctx.update_include_inherent_vowel(new_state);
        drop(ctx);
        self.inherent_vowel_item.set_checked(new_state);
        messages.push(crate::ThreadMessageType::RerenderUI);
        (false, messages)
      }
      TrayMenuEvent::Quit => {
        // Return true to signal application should quit (true)
        (true, messages)
      }
      TrayMenuEvent::OpenApp => {
        // Send message to UI to restore the minimized window
        messages.push(crate::ThreadMessageType::MaximizeUI);
        (false, messages)
      }
      TrayMenuEvent::ScriptSelected(script_name) => {
        let current_options = {
          let ctx = self.app_state.typing_context.lock().unwrap();
          Some(lipilekhika::typing::TypingContextOptions {
            auto_context_clear_time_ms: lipilekhika::typing::DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS,
            use_native_numerals: ctx.get_use_native_numerals(),
            include_inherent_vowel: ctx.get_include_inherent_vowel(),
          })
        };

        let new_context = lipilekhika::typing::TypingContext::new(&script_name, current_options);
        if let Ok(new_ctx) = new_context {
          {
            let mut ctx = self.app_state.typing_context.lock().unwrap();
            *ctx = new_ctx;
          }

          // Update checkmarks on all script items (without holding lock)
          for (item, name) in &self.script_items {
            let is_selected = name == &script_name;
            item.set_checked(is_selected);
          }

          // update_tooltip() also locks typing_context, so must be called after dropping lock
          self.update_tooltip();
          // Notify UI to rerender
          messages.push(crate::ThreadMessageType::RerenderUI);
        }
        (false, messages)
      }
    }
  }
}

/// Runs the tray icon event loop in a separate thread
pub fn run_tray_thread(
  app_state: Arc<AppState>,
  shutdown: Arc<AtomicBool>,
  tx_ui: Sender<crate::ThreadMessage>,
  rx: Receiver<crate::ThreadMessage>,
) -> std::thread::JoinHandle<()> {
  std::thread::spawn(move || {
    let mut tray_manager = match TrayManager::new(Arc::clone(&app_state)) {
      Ok(manager) => manager,
      Err(e) => {
        eprintln!("Failed to create tray icon: {}", e);
        return;
      }
    };

    // Subscribe to menu events
    let menu_channel = MenuEvent::receiver();
    // Subscribe to tray icon click events
    let tray_icon_channel = TrayIconEvent::receiver();

    // Helper closure to send messages
    let send_messages = |tx_ui: &Sender<crate::ThreadMessage>,
                         messages: Vec<crate::ThreadMessageType>| {
      for msg_type in messages {
        let _ = tx_ui.send(crate::ThreadMessage {
          origin: crate::ThreadMessageOrigin::Tray,
          msg: msg_type,
        });
      }
    };

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

        while let Ok(thread_msg) = rx.try_recv() {
          if !matches!(thread_msg.origin, crate::ThreadMessageOrigin::Tray) {
            use crate::ThreadMessageType;

            // println!("Tray thread_msg: {:?}", thread_msg);
            match thread_msg.msg {
              ThreadMessageType::RerenderTray => {
                tray_manager.update_ui();
              }
              _ => {}
            }
          }
        }

        while let Ok(event) = menu_channel.try_recv() {
          let (should_quit, messages) = tray_manager.handle_menu_event(event);
          send_messages(&tx_ui, messages);
          if should_quit {
            shutdown.store(true, Ordering::SeqCst);
            // std::process::exit(0);
            break; // Let main thread handle graceful shutdown  
          }
        }

        // Handle tray icon click events (double-click to open app)
        while let Ok(event) = tray_icon_channel.try_recv() {
          if let TrayIconEvent::DoubleClick { .. } = event {
            // Double-click on tray icon opens the app
            let _ = tx_ui.send(crate::ThreadMessage {
              origin: crate::ThreadMessageOrigin::Tray,
              msg: crate::ThreadMessageType::MaximizeUI,
            });
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

        // Check for thread messages (RerenderTray)
        while let Ok(thread_msg) = rx.try_recv() {
          // Only process messages not originating from Tray
          if !matches!(thread_msg.origin, crate::ThreadMessageOrigin::Tray) {
            match thread_msg.msg {
              crate::ThreadMessageType::RerenderTray => {
                tray_manager.update_ui();
              }
              _ => {} // Ignore other message types
            }
          }
        }

        // Check for menu events (non-blocking with timeout)
        if let Ok(event) = menu_channel.recv_timeout(std::time::Duration::from_millis(100)) {
          let (should_quit, messages) = tray_manager.handle_menu_event(event);
          send_messages(&tx_ui, messages);
          if should_quit {
            shutdown.store(true, Ordering::SeqCst);
            std::process::exit(0);
          }
        }

        // Handle tray icon click events (double-click to open app)
        while let Ok(event) = tray_icon_channel.try_recv() {
          if let TrayIconEvent::DoubleClick { .. } = event {
            // Double-click on tray icon opens the app
            let _ = tx_ui.send(crate::ThreadMessage {
              origin: crate::ThreadMessageOrigin::Tray,
              msg: crate::ThreadMessageType::MaximizeUI,
            });
          }
        }
      }
    }
  })
}
