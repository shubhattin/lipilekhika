use dotenvy::dotenv;
use std::{env, fs, path::PathBuf};

fn main() {
  {
    // posthog env setup
    dotenv().ok();

    // Tell Cargo to re-run build.rs if env changes
    println!("cargo:rerun-if-env-changed=PC_APP_POSTHOG_KEY");

    if let Ok(val) = env::var("PC_APP_POSTHOG_KEY") {
      // Pass it to rustc as a compile-time env var
      println!("cargo:rustc-env=PC_APP_POSTHOG_KEY={}", val);
    }
  }

  // Only compile resources on Windows
  if env::var("CARGO_CFG_WINDOWS").is_err() {
    return;
  }

  // Read crate version
  let ver = env::var("CARGO_PKG_VERSION").expect("CARGO_PKG_VERSION not set");
  // parse version parts into integers (major, minor, patch)
  let mut parts = ver.split('.').map(|s| s.parse::<u16>().unwrap_or(0));
  let major = parts.next().unwrap_or(0);
  let minor = parts.next().unwrap_or(0);
  let patch = parts.next().unwrap_or(0);

  // Compose a .rc content that includes an icon and VERSIONINFO
  let rc = format!(
    r#"
#include <windows.h>

IDI_APP_ICON ICON "assets/icon.ico"

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
   VALUE "FileDescription", "Lipi Lekhika - Indic Script Typing Tool\0"
   VALUE "FileVersion", "{ver}\0"
   VALUE "InternalName", "lipilekhika.exe\0"
   VALUE "LegalCopyright", "Copyright (C) 2026 Shubham Anand Gupta\0"
   VALUE "OriginalFilename", "lipilekhika.exe\0"
   VALUE "ProductName", "Lipi Lekhika\0"
   VALUE "ProductVersion", "{ver}\0"
  }}
 }}
 BLOCK "VarFileInfo"
 {{
  VALUE "Translation", 0x0409, 1200
 }}
}}
"#,
    major = major,
    minor = minor,
    patch = patch,
    ver = ver
  );

  let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
  let rc_path = out_dir.join("lipilekhika.rc");
  fs::write(&rc_path, rc).expect("write rc file");

  // compile the rc (embed it in the binary)
  embed_resource::compile(rc_path.to_str().unwrap(), embed_resource::NONE);
}
