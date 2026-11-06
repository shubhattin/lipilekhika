//! The embedded, pre-generated script data.
//!
//! `src/generated/lipi_data.bin` is written by `lipilekhika-datagen` (see
//! `packages/rust/datagen`) and committed to git, so building the crate needs no build
//! script or code generation.

use alloc::boxed::Box;
use once_cell::race::OnceBox;

use super::schema::LipiDataBlob;
use crate::scripts::SCRIPTS;

static LIPI_DATA_BYTES: &[u8] = include_bytes!("../generated/lipi_data.bin");

static LIPI_DATA_CACHE: OnceBox<LipiDataBlob> = OnceBox::new();

/// Decodes the embedded blob once and initialises the runtime lookups of every script.
pub(crate) fn get_lipi_data() -> &'static LipiDataBlob {
    LIPI_DATA_CACHE.get_or_init(|| {
        // This crate is `#![no_std]`; bincode is built with `default-features = false`
        // (`serde` + `alloc` only), so decode from the slice with the same explicit
        // `config::standard()` used by `lipilekhika-datagen`.
        let (mut blob, read): (LipiDataBlob, usize) =
            bincode::serde::decode_from_slice(LIPI_DATA_BYTES, bincode::config::standard())
                .unwrap_or_else(|e| panic!("bincode decode failed for lipi_data.bin: {e}"));
        assert_eq!(
            read,
            LIPI_DATA_BYTES.len(),
            "trailing bytes in lipi_data.bin"
        );
        assert_eq!(
            blob.script_data.len(),
            SCRIPTS.len(),
            "lipi_data.bin is out of sync with src/scripts.rs"
        );
        for (data, (name, _)) in blob.script_data.iter_mut().zip(SCRIPTS) {
            assert_eq!(
                data.script_name, *name,
                "lipi_data.bin is out of sync with src/scripts.rs"
            );
            data.init_lookups();
        }
        Box::new(blob)
    })
}
