use flutter_rust_bridge::frb;
use std::sync::RwLock;

/// Default time in milliseconds after which the context will be cleared automatically.
#[frb(sync)]
pub fn default_auto_context_clear_time_ms() -> u64 {
  lipilekhika::typing::DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS
}

/// Default value for using native numerals while typing.
#[frb(sync)]
pub fn default_use_native_numerals() -> bool {
  lipilekhika::typing::DEFAULT_USE_NATIVE_NUMERALS
}

/// Default value for including inherent vowels while typing.
#[frb(sync)]
pub fn default_include_inherent_vowel() -> bool {
  lipilekhika::typing::DEFAULT_INCLUDE_INHERENT_VOWEL
}

/// Options for configuring a typing context.
#[frb(dart_metadata = ("freezed"))]
pub struct TypingContextOptions {
  /// The time in milliseconds after which the context will be cleared automatically.
  pub auto_context_clear_time_ms: u64,
  /// Use native numerals in transliteration/typing.
  pub use_native_numerals: bool,
  /// Include inherent vowels (schwa character) in transliteration/typing.
  pub include_inherent_vowel: bool,
}

impl Default for TypingContextOptions {
  fn default() -> Self {
    Self {
      auto_context_clear_time_ms: lipilekhika::typing::DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS,
      use_native_numerals: lipilekhika::typing::DEFAULT_USE_NATIVE_NUMERALS,
      include_inherent_vowel: lipilekhika::typing::DEFAULT_INCLUDE_INHERENT_VOWEL,
    }
  }
}

impl From<TypingContextOptions> for lipilekhika::typing::TypingContextOptions {
  fn from(opts: TypingContextOptions) -> Self {
    Self {
      auto_context_clear_time_ms: opts.auto_context_clear_time_ms,
      use_native_numerals: opts.use_native_numerals,
      include_inherent_vowel: opts.include_inherent_vowel,
    }
  }
}

/// Result of processing a single key in a typing context.
#[frb(dart_metadata = ("freezed"))]
pub struct TypingDiff {
  /// Number of characters that should be deleted from the current input state.
  pub to_delete_chars_count: usize,
  /// Text that should be inserted into the current input state.
  pub diff_add_text: String,
}

/// Stateful isolated context for character-by-character input typing.
///
/// This is wrapped in RwLock to make it thread-safe for flutter_rust_bridge.
#[frb(opaque)]
pub struct TypingContext {
  inner: RwLock<lipilekhika::typing::TypingContext>,
}

impl TypingContext {
  /// Creates a new typing context for the given script/language.
  #[frb(sync)]
  pub fn new(typing_lang: String, options: Option<TypingContextOptions>) -> Result<Self, String> {
    let rust_options = options.map(|o| o.into());
    lipilekhika::typing::TypingContext::new(&typing_lang, rust_options)
      .map(|ctx| TypingContext {
        inner: RwLock::new(ctx),
      })
  }

  /// Clears all internal state and contexts.
  #[frb(sync)]
  pub fn clear_context(&self) {
    if let Ok(mut inner) = self.inner.write() {
      inner.clear_context();
    }
  }

  /// Accepts character-by-character input and returns the diff relative to the previous output.
  #[frb(sync)]
  pub fn take_key_input(&self, key: String) -> Result<TypingDiff, String> {
    let mut inner = self.inner.write().map_err(|e| e.to_string())?;
    inner.take_key_input(&key).map(|diff| TypingDiff {
      to_delete_chars_count: diff.to_delete_chars_count,
      diff_add_text: diff.diff_add_text,
    })
  }

  /// Updates whether native numerals should be used for subsequent typing.
  #[frb(sync)]
  pub fn update_use_native_numerals(&self, use_native_numerals: bool) {
    if let Ok(mut inner) = self.inner.write() {
      inner.update_use_native_numerals(use_native_numerals);
    }
  }

  /// Updates whether inherent vowels should be included for subsequent typing.
  #[frb(sync)]
  pub fn update_include_inherent_vowel(&self, include_inherent_vowel: bool) {
    if let Ok(mut inner) = self.inner.write() {
      inner.update_include_inherent_vowel(include_inherent_vowel);
    }
  }

  /// Gets whether native numerals are currently enabled.
  #[frb(sync)]
  pub fn get_use_native_numerals(&self) -> bool {
    self
      .inner
      .read()
      .map(|inner| inner.get_use_native_numerals())
      .unwrap_or(false)
  }

  /// Gets whether inherent vowels are currently included.
  #[frb(sync)]
  pub fn get_include_inherent_vowel(&self) -> bool {
    self
      .inner
      .read()
      .map(|inner| inner.get_include_inherent_vowel())
      .unwrap_or(false)
  }

  /// Returns the normalized script name.
  #[frb(sync)]
  pub fn get_normalized_script(&self) -> String {
    self
      .inner
      .read()
      .map(|inner| inner.get_normalized_script())
      .unwrap_or_default()
  }
}

/// Type of a character in a script's list.
#[frb(dart_metadata = ("freezed"))]
pub enum ListType {
  Anya,
  Vyanjana,
  Matra,
  Svara,
}

impl From<&lipilekhika::typing::ListType> for ListType {
  fn from(lt: &lipilekhika::typing::ListType) -> Self {
    match lt {
      lipilekhika::typing::ListType::Anya => ListType::Anya,
      lipilekhika::typing::ListType::Vyanjana => ListType::Vyanjana,
      lipilekhika::typing::ListType::Matra => ListType::Matra,
      lipilekhika::typing::ListType::Svara => ListType::Svara,
    }
  }
}

/// An item in the typing data map.
#[frb(dart_metadata = ("freezed"))]
pub struct TypingDataMapItem {
  /// The displayed character/text in the target script.
  pub text: String,
  /// Type of the character (anya, vyanjana, matra, svara).
  pub list_type: ListType,
  /// List of input key sequences that produce this character.
  pub mappings: Vec<String>,
}

/// Result containing typing data for a script.
#[frb(dart_metadata = ("freezed"))]
pub struct ScriptTypingDataMap {
  /// Mappings for common characters across scripts.
  pub common_krama_map: Vec<TypingDataMapItem>,
  /// Mappings for script-specific characters.
  pub script_specific_krama_map: Vec<TypingDataMapItem>,
}

/// Returns the typing data map for a script.
///
/// # Arguments
/// * `script` - The script/language name to get the typing data map for.
///
/// # Returns
/// The typing data map for the script.
///
/// # Errors
/// Returns an error if the script name is invalid or is 'Normal' (English).
#[frb(sync)]
pub fn get_script_typing_data_map(script: String) -> Result<ScriptTypingDataMap, String> {
  lipilekhika::typing::get_script_typing_data_map(&script).map(|data| ScriptTypingDataMap {
    common_krama_map: data
      .common_krama_map
      .into_iter()
      .map(|(text, list_type, mappings)| TypingDataMapItem {
        text,
        list_type: ListType::from(&list_type),
        mappings,
      })
      .collect(),
    script_specific_krama_map: data
      .script_specific_krama_map
      .into_iter()
      .map(|(text, list_type, mappings)| TypingDataMapItem {
        text,
        list_type: ListType::from(&list_type),
        mappings,
      })
      .collect(),
  })
}

/// An item in the krama data.
#[frb(dart_metadata = ("freezed"))]
pub struct KramaDataItem {
  /// The displayed character in the target script.
  pub character_text: String,
  /// Type of the character (anya, vyanjana, matra, svara).
  pub list_type: ListType,
}

/// Returns the krama data for a script (character + type pairs).
///
/// Used for comparing character sets between scripts. Each script's krama array
/// has a 1:1 correspondence at the same indices, making it useful for side-by-side
/// comparison of characters across Brahmic scripts.
///
/// # Arguments
/// * `script` - The script/language name to get krama data for.
///
/// # Returns
/// List of (character_text, list_type) items.
///
/// # Errors
/// Returns an error if the script name is invalid or is 'Normal' (English).
#[frb(sync)]
pub fn get_script_krama_data(script: String) -> Result<Vec<KramaDataItem>, String> {
  lipilekhika::typing::get_script_krama_data(&script).map(|data| {
    data
      .into_iter()
      .map(|(text, list_type)| KramaDataItem {
        character_text: text,
        list_type: ListType::from(&list_type),
      })
      .collect()
  })
}
