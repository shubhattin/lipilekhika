//! The old Lipi Parivartaka icon and the version info on Windows

use std::{env, fs, path::PathBuf};

fn main() {
  if env::var("CARGO_CFG_WINDOWS").is_err() {
    return;
  }
  // the VC++ runtime linked into the exe, like lipilekhika.exe (it starts on a fresh Windows)
  if env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("msvc") {
    static_vcruntime::metabuild();
  }
  let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
  let rc_path = out_dir.join("launcher.rc");
  fs::write(&rc_path, rc()).expect("write rc file");
  embed_resource::compile(rc_path.to_str().unwrap(), embed_resource::NONE);
}

/// The resource script: the icon and the version info
fn rc() -> String {
  let ver = env::var("CARGO_PKG_VERSION").unwrap();
  let mut parts = ver.split('.').map(|s| s.parse::<u16>().unwrap_or(0));
  let (major, minor, patch) = (
    parts.next().unwrap_or(0),
    parts.next().unwrap_or(0),
    parts.next().unwrap_or(0),
  );
  // the rc file is in OUT_DIR: the icon by its full path
  let icon = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap())
    .join("../assets/lipiparivartaka.ico")
    .to_string_lossy()
    .replace('\\', "/");
  format!(
    r#"
#include <windows.h>

1 ICON "{icon}"

1 VERSIONINFO
 FILEVERSION {major},{minor},{patch},0
 PRODUCTVERSION {major},{minor},{patch},0
 FILEFLAGSMASK 0x3fL
 FILEOS 0x40004L
 FILETYPE 0x1L
{{
 BLOCK "StringFileInfo"
 {{
  BLOCK "040904B0"
  {{
   VALUE "CompanyName", "Lipi Lekhika\0"
   VALUE "FileDescription", "Lipi Parivartaka\0"
   VALUE "FileVersion", "{ver}\0"
   VALUE "InternalName", "Lipi Parivartaka.exe\0"
   VALUE "LegalCopyright", "Copyright (C) 2026 Shubham Anand Gupta\0"
   VALUE "OriginalFilename", "Lipi Parivartaka.exe\0"
   VALUE "ProductName", "Lipi Lekhika\0"
   VALUE "ProductVersion", "{ver}\0"
  }}
 }}
 BLOCK "VarFileInfo"
 {{
  VALUE "Translation", 0x0409, 1200
 }}
}}
"#
  )
}
