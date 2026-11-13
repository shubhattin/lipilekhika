//! The app's asset source: the default GPUI Kit component icons, the extra Lucide icons the app
//! uses, and the bundled script fonts.

use gpui_kit::assets::{Assets as ComponentAssets, icon_assets};
use gpui_kit::{App, AssetSource, Image, ImageFormat, Result, SharedString};
use std::borrow::Cow;
use std::sync::{Arc, LazyLock};

icon_assets!(pub ExtraIcons, [
  Keyboard,
  KeyboardOff,
  ArrowLeftRight,
  Download,
  X,
  Languages,
  Monitor,
  SunMoon,
  FileUp,
  Sparkles,
  CircleArrowDown,
  Type,
  Clipboard,
  ClipboardCheck,
  Columns2,
]);

pub struct AppAssets;

impl AssetSource for AppAssets {
  fn load(&self, path: &str) -> Result<Option<Cow<'static, [u8]>>> {
    if let Some(bytes) = ExtraIcons.load(path)? {
      return Ok(Some(bytes));
    }
    ComponentAssets.load(path)
  }

  fn list(&self, path: &str) -> Result<Vec<SharedString>> {
    let mut paths = ComponentAssets.list(path)?;
    paths.extend(ExtraIcons.list(path)?);
    paths.sort();
    paths.dedup();
    Ok(paths)
  }
}

pub const APP_ICON_PNG: &[u8] = include_bytes!("../../assets/icon.png");

/// The app icon as an image element source
pub fn app_icon() -> Arc<Image> {
  static ICON: LazyLock<Arc<Image>> =
    LazyLock::new(|| Arc::new(Image::from_bytes(ImageFormat::Png, APP_ICON_PNG.to_vec())));
  ICON.clone()
}

/// The app icon decoded, for the window icon (X11)
pub fn app_icon_rgba() -> Option<Arc<image::RgbaImage>> {
  static ICON: LazyLock<Option<Arc<image::RgbaImage>>> = LazyLock::new(|| {
    image::load_from_memory(APP_ICON_PNG)
      .ok()
      .map(|img| Arc::new(img.to_rgba8()))
  });
  ICON.clone()
}

const FONTS: &[&[u8]] = &[
  include_bytes!("../../assets/fonts/NotoSans.ttf"),
  include_bytes!("../../assets/fonts/NotoSansDevanagari.ttf"),
  include_bytes!("../../assets/fonts/NotoSansBengali.ttf"),
  include_bytes!("../../assets/fonts/NotoSansGujarati.ttf"),
  include_bytes!("../../assets/fonts/NotoSansGurmukhi.ttf"),
  include_bytes!("../../assets/fonts/NotoSansKannada.ttf"),
  include_bytes!("../../assets/fonts/NotoSansMalayalam.ttf"),
  include_bytes!("../../assets/fonts/NotoSansOriya.ttf"),
  include_bytes!("../../assets/fonts/NotoSansSinhala.ttf"),
  include_bytes!("../../assets/fonts/NotoSansTamil.ttf"),
  include_bytes!("../../assets/fonts/NotoSansTamilSupplement.ttf"),
  include_bytes!("../../assets/fonts/NotoSansTelugu.ttf"),
  include_bytes!("../../assets/fonts/NotoSansBrahmi.ttf"),
  include_bytes!("../../assets/fonts/NotoSansGrantha.ttf"),
  include_bytes!("../../assets/fonts/NotoSansModi.ttf"),
  include_bytes!("../../assets/fonts/NotoSansSharada.ttf"),
  include_bytes!("../../assets/fonts/NotoSansSiddham.ttf"),
  include_bytes!("../../assets/fonts/SatisarSharada.ttf"),
];

/// Registers the bundled script fonts, before the first window measures any text
pub fn register_fonts(cx: &mut App) {
  let fonts = FONTS.iter().map(|f| Cow::Borrowed(*f)).collect();
  if let Err(err) = cx.text_system().add_fonts(fonts) {
    eprintln!("Failed to load the bundled fonts: {err}");
  }
}
