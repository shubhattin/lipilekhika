# Vendored crates

## `gpui-pre-linux` 0.3.12

GPUI's Linux backend (from crates.io, Apache-2.0, see its `LICENSE-APACHE`), used through
`[patch.crates-io]` in `.cargo/config.toml` (not the root `Cargo.toml`, which the Python sdist ships without `desktop-client/`), with one change (marked `[lipilekhika patch]`):

- A window opened with `is_resizable: false` gets its own size as both its minimum and maximum
  size (`xdg_toplevel` on Wayland, `WM_NORMAL_HINTS` on X11). Upstream always sets the maximum
  to the GPU's texture size, so tiling compositors (Hyprland, sway, i3...) tile the small main
  window to the whole screen instead of floating it at its size.

When `gpui-kit` moves to a newer GPUI snapshot, update this copy to the same `gpui-pre-linux`
version and apply the change again (or drop it once upstream sets the size limits itself).
