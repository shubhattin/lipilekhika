# Research plan: Windows-like system wide typing on Linux

On Windows the app types everywhere through a low level keyboard hook: it sees every key
(`WH_KEYBOARD_LL`), swallows it, runs it through the `TypingContext` and sends back backspaces and
Unicode text (`SendInput` with `KEYEVENTF_UNICODE`). Alt+X turns it on and off, the tray and the
main window pick the script. On Linux the same today is the Fcitx5 plugin (`plugins/fcitx5`),
which works well but needs Fcitx5 set up, and is configured in Fcitx5, not in the app.

The question: can the GPUI app itself type everywhere on Linux, like on Windows?

## Short answer

Yes, but not with one mechanism. Linux has no Windows-style global hook on Wayland **by design**
(a client can't see or inject other clients' keys). The ways in:

| Way | Works on | Sees keys | Types text | Setup for the user | Fits the app |
| --- | --- | --- | --- | --- | --- |
| **A. Input method protocol** (`zwp_input_method_v2` + keyboard grab) | Hyprland, sway, other wlroots, (KWin: `input_method_v1`) | yes, while a text field is focused | `commit_string`, `delete_surrounding_text` | none, but no other IM (Fcitx5/IBus) may run | very well: the app **is** the IME |
| **B. IBus engine** (D-Bus) | GNOME (its default), most DEs | yes | commit, surrounding text | add the engine in Settings | well, a second front end like the Fcitx5 plugin |
| **C. evdev read + uinput / virtual keyboard write** (espanso style) | any (X11, every Wayland) | yes, all keys, raw | backspaces + text through a virtual keyboard | user in the `input` group (or a udev rule) | closest to the Windows hook, rough edges |
| **D. X11 only**: XRecord/XInput2 + XTest | X11 sessions | yes | XTest with a remapped keysym | none | dying platform, only as a fallback |
| **E. Keep Fcitx5, drive it from the app** | wherever Fcitx5 runs | (Fcitx5 does) | (Fcitx5 does) | Fcitx5 + the addon | small: the app's toggle and script picker control the addon |

## Recommendation

1. **Now (small, sure):** E. Let the Linux app control the Fcitx5 addon: the main window's
   "Typing" switch, script picker and the two options write the addon's config (or call Fcitx5
   over D-Bus to switch to `lipilekhika-<script>`), and show whether Fcitx5 and the addon are
   installed, with a link to set them up. The Linux main window then works like on Windows,
   without a second typing engine.
2. **Next (the real Windows-like feature):** A, the app as a Wayland input method, behind a
   `LinuxTypingBackend` trait, for Hyprland/sway users who don't want Fcitx5. It needs no
   permissions and edits text the proper way (surrounding text, no fake backspaces).
3. **Then, for GNOME:** B, an IBus engine sharing the same core (GNOME has no
   `input_method_v2`, IBus is the only clean way in there).
4. **Only if users need it everywhere at once:** C, as an opt-in "raw" mode. It is the only one
   that also works in apps without IME support (some games, terminals without IME, some
   XWayland apps), at the cost of the `input` group.

## The pieces to research (spikes), in order

### Spike 1: Fcitx5 control from the app (1-2 days)
- Read how the addon stores its script and options (`plugins/fcitx5/addon`, its `.conf`), and what
  Fcitx5 exposes on D-Bus (`org.fcitx.Fcitx.Controller1`: current input method, set it,
  toggle, state).
- Prototype in the GPUI app (`zbus`): read and set the current IM, toggle, detect "Fcitx5 not
  running" and "addon not installed".
- Done when: switching the script in the app switches the IM, and the switch follows Fcitx5
  being toggled elsewhere.

### Spike 2: the app as a Wayland input method (3-5 days)
- Protocols: `zwp_input_method_manager_v2` (+ `zwp_input_method_keyboard_grab_v2`) on wlroots
  and Hyprland; `zwp_input_method_v1` on KWin. GNOME has neither. Rust: `wayland-client` +
  `wayland-protocols-misc` (has `input_method_unstable_v2`, `virtual_keyboard_unstable_v1`).
- Run it on its own thread with its own Wayland connection (GPUI's connection is not shared),
  like the Windows hook thread; it uses the existing `AppState` (`typing_enabled`,
  `typing_context`) and `ThreadMessage`s unchanged.
- Key flow on `activate`: grab the keyboard; for each key: Alt+X toggles (and shows the popup);
  with typing on, a printable key goes to `take_key_input_char`, then
  `delete_surrounding_text(bytes of to_delete_chars_count chars before the caret, 0)` +
  `commit_string(diff_add_text)` + `commit(serial)`; any other key (and every key with typing
  off) goes back to the app through the virtual keyboard (the grab takes all keys, so the IME
  must send the rest on, the way Fcitx5 does on wlroots).
- `delete_surrounding_text` counts bytes of the surrounding text: check clients without
  surrounding text support (fallback: BackSpace through the virtual keyboard, as on Windows).
- Risks: only one input method can be bound (Fcitx5/IBus must not run); the keyboard grab needs
  keymap handling (`xkbcommon`) and key repeat done by us; XWayland apps don't get
  `text-input-v3`, so typing there needs C or XIM.
- Done when: typing `namaste` gives नमस्ते in GTK, Qt, Firefox, Chromium (with
  `--enable-wayland-ime`) and a GPUI/Zed window on Hyprland, and Alt+X toggles it.

### Spike 3: IBus engine (3-4 days)
- An IBus engine is a D-Bus service (`org.freedesktop.IBus.Engine`: `ProcessKeyEvent`, and the
  `CommitText` / `DeleteSurroundingText` signals) plus a component XML in
  `/usr/share/ibus/component`. Rust with `zbus`; the Fcitx5 addon's logic is the reference.
- Packaging: the component file and an `--ibus` mode of the app binary (IBus starts it).
- Done when: on GNOME, after adding "Lipi Lekhika" in Settings → Keyboard, typing works in GTK4
  and Firefox.

### Spike 4: evdev + virtual keyboard (only if needed, 4-6 days)
- Read: `/dev/input/event*` keyboards with `evdev`, `EVIOCGRAB` to swallow keys, `xkbcommon`
  for the layout. Write: a `uinput` device for the passed-through keys; for Unicode text either
  `zwp_virtual_keyboard_v1` with an uploaded keymap holding the needed keysyms (wlroots, KWin),
  or the clipboard + Ctrl+V (espanso's fallback), or XTest on X11.
- Needs the user in the `input` group or a udev rule for the app; document it, never on by
  default.
- Risks: several keyboards (a grab each), lost keys over suspend/resume, no idea where the caret
  is (the same as Windows: clear the context on clicks, arrows, focus changes).

## How it plugs into the app

`platform.rs` already has the seam: `SYSTEM_TYPING_SUPPORTED` and `platform::run(app_state,
tx_ui, tx_tray)` on a thread of its own. A Linux backend is a `linux/` module next to `win/` and
`mac/`, choosing at runtime: the input method protocol if the compositor offers it, else IBus,
else the Fcitx5 control mode. The UI needs no change beyond `SYSTEM_TYPING_SUPPORTED` becoming a
runtime check and the Linux note in the main window naming the backend in use.
