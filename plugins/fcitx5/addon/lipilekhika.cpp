/*
 * Minimal Fcitx5 input method engine that uses Lipilekhika Rust typing core.
 *
 * Notes:
 * - This is intentionally "v1 minimal": ASCII roman key -> preedit diff -> preedit update.
 * - Backspace is implemented by replaying `raw_ascii_` (no Rust-side pop API yet).
 */

#include "lipilekhika.h"

#include <fcitx/inputcontext.h>
#include <fcitx/inputmethodentry.h>
#include <fcitx/inputpanel.h>
#include <fcitx/userinterface.h>
#include <fcitx-utils/key.h>
#include <fcitx-utils/keysym.h>

#include <algorithm>

namespace {

// Remove last Unicode codepoint from a UTF-8 string.
static void truncateLastCodepoints(std::string &s, size_t n) {
  while (n-- > 0 && !s.empty()) {
    // Walk back to the beginning of the last UTF-8 codepoint.
    size_t i = s.size();
    do {
      --i;
    } while (i > 0 && ((static_cast<unsigned char>(s[i]) & 0xC0) == 0x80));
    s.erase(i);
  }
}

static bool isPrintableAscii(uint32_t sym) { return sym >= 0x20 && sym <= 0x7E; }

static bool hasCtrlAltSuper(const fcitx::Key &key) {
  auto states = key.states();
  using fcitx::KeyState;
  return (states & KeyState::Ctrl) || (states & KeyState::Alt) || (states & KeyState::Super);
}

static void updatePreeditUI(fcitx::InputContext *ic, const std::string &preedit) {
  fcitx::Text text;
  text.append(preedit);
  ic->inputPanel().setClientPreedit(text);
  ic->inputPanel().setPreedit(text);
  ic->updatePreedit();
  ic->updateUserInterface(fcitx::UserInterfaceComponent::InputPanel);
}

} // namespace

bool LipilekhikaState::ensureContext(const std::string &script) {
  if (ctx_ && script_ == script) {
    return true;
  }

  if (ctx_) {
    lipi_typing_context_free(ctx_);
    ctx_ = nullptr;
  }

  script_ = script;
  LipiTypingContextOptions opts;
  lipi_typing_default_options(&opts);

  // Devanagari/Hindi feel more natural with inherent vowel included.
  if (script_ == "Devanagari") {
    opts.include_inherent_vowel = true;
  }

  LipiString err = {};
  auto status =
      lipi_typing_context_new(script_.c_str(), &opts, &ctx_, &err);
  if (status != Ok) {
    if (err.ptr) {
      lipi_string_free(err);
    }
    ctx_ = nullptr;
    return false;
  }
  if (err.ptr) {
    lipi_string_free(err);
  }
  return true;
}

void LipilekhikaState::clear() {
  raw_ascii_.clear();
  preedit_utf8_.clear();
  if (ctx_) {
    lipi_typing_context_clear(ctx_);
  }
}

void LipilekhikaState::rebuildFromRaw() {
  preedit_utf8_.clear();
  if (ctx_) {
    lipi_typing_context_clear(ctx_);
  }
  for (char ch : raw_ascii_) {
    const char keyStr[2] = {ch, 0};
    LipiTypingDiff diff = {};
    LipiString err = {};
    auto status = lipi_typing_context_take_key_input(ctx_, keyStr, &diff, &err);
    if (status != Ok) {
      if (err.ptr) {
        lipi_string_free(err);
      }
      clear();
      return;
    }
    if (err.ptr) {
      lipi_string_free(err);
    }
    if (diff.to_delete_chars_count) {
      truncateLastCodepoints(preedit_utf8_, diff.to_delete_chars_count);
    }
    if (diff.diff_add_text.ptr && diff.diff_add_text.len) {
      preedit_utf8_.append(diff.diff_add_text.ptr,
                           diff.diff_add_text.len);
    }
    lipi_string_free(diff.diff_add_text);
  }
}

LipilekhikaEngine::LipilekhikaEngine(fcitx::Instance *instance)
    : instance_(instance),
      factory_([this](fcitx::InputContext &ic) { return new LipilekhikaState(&ic); }) {
  instance_->inputContextManager().registerProperty("lipilekhikaState", &factory_);
}

void LipilekhikaEngine::keyEvent(const fcitx::InputMethodEntry &entry,
                                 fcitx::KeyEvent &keyEvent) {
  FCITX_UNUSED(entry);

  if (keyEvent.isRelease()) {
    return;
  }

  auto *ic = keyEvent.inputContext();
  if (!ic) {
    return;
  }

  // Keep this minimal for v1: only handle plain typing keys (no Ctrl/Alt/Super).
  const auto key = keyEvent.key();
  if (hasCtrlAltSuper(key)) {
    return;
  }

  auto *state = ic->propertyFor(&factory_);
  if (!state) {
    return;
  }

  // For now: one IM -> Devanagari. Later we can derive script from entry.uniqueName().
  if (!state->ensureContext("Devanagari")) {
    return;
  }

  const uint32_t sym = key.sym();

  // Cancel composition.
  if (sym == FcitxKey_Escape) {
    state->clear();
    updatePreeditUI(ic, state->preedit_utf8_);
    keyEvent.filterAndAccept();
    return;
  }

  // Commit preedit on Return.
  if (sym == FcitxKey_Return || sym == FcitxKey_KP_Enter) {
    if (!state->preedit_utf8_.empty()) {
      ic->commitString(state->preedit_utf8_);
      state->clear();
      updatePreeditUI(ic, state->preedit_utf8_);
      keyEvent.filterAndAccept();
      return;
    }
    return;
  }

  // Backspace inside composition: replay raw buffer.
  if (sym == FcitxKey_BackSpace) {
    if (state->raw_ascii_.empty()) {
      return;
    }
    state->raw_ascii_.pop_back();
    state->rebuildFromRaw();
    updatePreeditUI(ic, state->preedit_utf8_);
    keyEvent.filterAndAccept();
    return;
  }

  // Space: commit preedit + a space (m17n-like feel).
  if (sym == FcitxKey_space) {
    if (!state->preedit_utf8_.empty()) {
      ic->commitString(state->preedit_utf8_);
      ic->commitString(" ");
      state->clear();
      updatePreeditUI(ic, state->preedit_utf8_);
      keyEvent.filterAndAccept();
      return;
    }
    return;
  }

  // Only accept printable ASCII for v1 roman typing.
  if (!isPrintableAscii(sym)) {
    // Non-text input: clear context so we don't desync.
    state->clear();
    updatePreeditUI(ic, state->preedit_utf8_);
    return;
  }

  char ch = static_cast<char>(sym);
  const char keyStr[2] = {ch, 0};

  LipiTypingDiff diff = {};
  LipiString err = {};
  auto status = lipi_typing_context_take_key_input(state->ctx_, keyStr, &diff, &err);
  if (status != Ok) {
    if (err.ptr) {
      lipi_string_free(err);
    }
    state->clear();
    updatePreeditUI(ic, state->preedit_utf8_);
    keyEvent.filterAndAccept();
    return;
  }
  if (err.ptr) {
    lipi_string_free(err);
  }

  state->raw_ascii_.push_back(ch);

  if (diff.to_delete_chars_count) {
    truncateLastCodepoints(state->preedit_utf8_, diff.to_delete_chars_count);
  }
  if (diff.diff_add_text.ptr && diff.diff_add_text.len) {
    state->preedit_utf8_.append(diff.diff_add_text.ptr, diff.diff_add_text.len);
  }
  lipi_string_free(diff.diff_add_text);

  updatePreeditUI(ic, state->preedit_utf8_);
  keyEvent.filterAndAccept();
}

fcitx::AddonInstance *LipilekhikaEngineFactory::create(fcitx::AddonManager *manager) {
  return new LipilekhikaEngine(manager->instance());
}

FCITX_ADDON_FACTORY(LipilekhikaEngineFactory);

