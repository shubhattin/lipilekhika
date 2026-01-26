use std::env;
use std::path::PathBuf;

fn main() {
  // Re-run if the API surface or cbindgen config changes.
  println!("cargo:rerun-if-changed=src/lib.rs");
  println!("cargo:rerun-if-changed=cbindgen.toml");

  let crate_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR"));
  let config_path = crate_dir.join("cbindgen.toml");
  let out_dir = crate_dir.join("include");
  let out_file = out_dir.join("lipilekhika_typing.h");

  std::fs::create_dir_all(&out_dir).expect("create include/ dir");

  let config = cbindgen::Config::from_file(&config_path).expect("read cbindgen.toml");
  cbindgen::Builder::new()
    .with_crate(crate_dir)
    .with_config(config)
    .generate()
    .expect("generate bindings")
    .write_to_file(out_file);
}

