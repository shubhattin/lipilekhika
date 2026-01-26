/*
 * Minimal Fcitx5 input method engine that uses Lipilekhika Rust typing core.
 *
 * Notes:
 * - This is intentionally "v1 minimal": ASCII roman key -> preedit diff -> preedit update.
 * - Backspace is implemented by replaying `raw_ascii_` (no Rust-side pop API yet).
 */

#include "lipilekhika.h"

#include <fcitx-config/iniparser.h>
#include <fcitx-config/rawconfig.h>
#include <fcitx/inputcontext.h>
#include <fcitx/inputmethodentry.h>
#include <fcitx/inputpanel.h>
#include <fcitx/userinterface.h>
#include <fcitx-utils/key.h>
#include <fcitx-utils/keysym.h>

#include <algorithm>
#include <cctype>
#include <string_view>
#include <unordered_map>

namespace {

static std::string normalizeKey(std::string_view s) {
  std::string out;
  out.reserve(s.size());
  bool lastWasDash = false;
  for (unsigned char ch : s) {
    if (std::isalnum(ch)) {
      out.push_back(static_cast<char>(std::tolower(ch)));
      lastWasDash = false;
    } else if (ch == '-' || ch == '_') {
      if (!out.empty() && !lastWasDash) {
        out.push_back('-');
        lastWasDash = true;
      }
    } else {
      // drop everything else (spaces, parentheses, etc.)
    }
  }
  if (!out.empty() && out.back() == '-') {
    out.pop_back();
  }
  return out;
}

static std::string scriptFromEntry(const fcitx::InputMethodEntry &entry) {
  // Prefer uniqueName() since it's stable and usually derived from the .conf filename.
  std::string raw = entry.uniqueName();
  if (raw.empty()) {
    raw = entry.name();
  }
  if (raw.empty()) {
    raw = entry.label();
  }

  // If it's "addon:name", keep the trailing portion.
  if (auto pos = raw.rfind(':'); pos != std::string::npos) {
    raw = raw.substr(pos + 1);
  }

  std::string key = normalizeKey(raw);
  constexpr std::string_view kPrefix = "lipilekhika-";
  if (key.rfind(kPrefix, 0) == 0) {
    key.erase(0, kPrefix.size());
  }

  return key;
}

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
  ic->updatePreedit();
}

} // namespace

bool LipilekhikaState::ensureContext(const std::string &script) {
  // Pull current engine options.
  const auto &cfg = engine_->config();
  const uint64_t autoMs = static_cast<uint64_t>(std::max(0, *cfg.autoContextClearTimeMs));
  const bool useNative = *cfg.useNativeNumerals;
  const bool includeInherent = *cfg.includeInherentVowel;

  if (ctx_ && script_ == script) {
    // Apply mutable options to existing context.
    if (use_native_numerals_ != useNative) {
      lipi_typing_context_set_use_native_numerals(ctx_, useNative);
      use_native_numerals_ = useNative;
    }
    if (include_inherent_vowel_ != includeInherent) {
      lipi_typing_context_set_include_inherent_vowel(ctx_, includeInherent);
      include_inherent_vowel_ = includeInherent;
    }
    // No setter for auto context clear time: recreate context if it changed.
    if (auto_context_clear_time_ms_ != autoMs) {
      resetContext();
      // fallthrough to recreate.
    } else {
      return true;
    }
  }

  // Either script changed or we need to recreate the context.
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
  opts.auto_context_clear_time_ms = autoMs;
  opts.use_native_numerals = useNative;
  opts.include_inherent_vowel = includeInherent;
  auto_context_clear_time_ms_ = autoMs;
  use_native_numerals_ = useNative;
  include_inherent_vowel_ = includeInherent;

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

void LipilekhikaState::resetContext() {
  raw_ascii_.clear();
  preedit_utf8_.clear();
  script_.clear();
  if (ctx_) {
    lipi_typing_context_free(ctx_);
    ctx_ = nullptr;
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
      factory_([this](fcitx::InputContext &ic) { return new LipilekhikaState(this, &ic); }) {
  reloadConfig();
  instance_->inputContextManager().registerProperty("lipilekhikaState", &factory_);
}

void LipilekhikaEngine::reloadConfig() {
  // User config: ~/.config/fcitx5/conf/lipilekhika.conf
  fcitx::readAsIni(config_, "conf/lipilekhika.conf");
  refreshAllContexts();
}

const fcitx::Configuration *LipilekhikaEngine::getConfig() const { return &config_; }

void LipilekhikaEngine::saveConfig() const { fcitx::safeSaveAsIni(config_, "conf/lipilekhika.conf"); }

void LipilekhikaEngine::refreshAllContexts() {
  if (!factory_.registered()) {
    return;
  }
  instance_->inputContextManager().foreach([this](fcitx::InputContext *ic) {
    auto *state = ic->propertyFor(&factory_);
    if (!state) {
      return true;
    }
    // Reset to make option changes deterministic and avoid desync.
    state->resetContext();
    updatePreeditUI(ic, state->preedit_utf8_);
    return true;
  });
}

void LipilekhikaEngine::setConfig(const fcitx::RawConfig &config) {
  config_.load(config, true);
  saveConfig();
  refreshAllContexts();
}

void LipilekhikaEngine::keyEvent(const fcitx::InputMethodEntry &entry,
                                 fcitx::KeyEvent &keyEvent) {
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

  const std::string script = scriptFromEntry(entry);
  if (!state->ensureContext(script)) {
    return;
  }

  const uint32_t sym = key.sym();

  // Cancel composition.
  if (sym == FcitxKey_Escape) {
    // Only consume Escape if we actually had an active composition.
    if (!state->preedit_utf8_.empty() || !state->raw_ascii_.empty()) {
      state->clear();
      updatePreeditUI(ic, state->preedit_utf8_);
      keyEvent.filterAndAccept();
    }
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

  // Commit preedit on Shift (without adding any character).
  if (sym == FcitxKey_Shift_L || sym == FcitxKey_Shift_R) {
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
    // Non-text input: if we are composing, clear so we don't desync,
    // but do NOT consume the key (let it pass through to the app).
    if (!state->preedit_utf8_.empty() || !state->raw_ascii_.empty()) {
      state->clear();
      updatePreeditUI(ic, state->preedit_utf8_);
    }
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

  // If Rust indicates the context has been cleared, commit immediately.
  // This keeps the preedit tooltip short and matches lipilekhika's internal context behavior.
  if (diff.context_length == 0) {
    if (!state->preedit_utf8_.empty()) {
      ic->commitString(state->preedit_utf8_);
    }
    state->clear();
    updatePreeditUI(ic, state->preedit_utf8_);
    keyEvent.filterAndAccept();
    return;
  }

  updatePreeditUI(ic, state->preedit_utf8_);
  keyEvent.filterAndAccept();
}

fcitx::AddonInstance *LipilekhikaEngineFactory::create(fcitx::AddonManager *manager) {
  return new LipilekhikaEngine(manager->instance());
}

FCITX_ADDON_FACTORY(LipilekhikaEngineFactory);

