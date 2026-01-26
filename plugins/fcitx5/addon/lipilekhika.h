/*
 * Minimal Fcitx5 input method engine that uses Lipilekhika Rust typing core.
 */
#ifndef _FCITX5_LIPILEKHIKA_H_
#define _FCITX5_LIPILEKHIKA_H_

#include <fcitx/addonfactory.h>
#include <fcitx/addonmanager.h>
#include <fcitx/inputcontextproperty.h>
#include <fcitx/inputmethodengine.h>
#include <fcitx/instance.h>
#include <fcitx/text.h>

#include <fcitx-config/configuration.h>
#include <fcitx-config/option.h>

#include <string>

#include "lipilekhika_typing.h"

class LipilekhikaEngine;

class LipilekhikaConfig final : public fcitx::Configuration {
public:
  fcitx::Option<int> autoContextClearTimeMs{
      this, "AutoContextClearTimeMs", "Auto clear context time (ms)", 4500};
  fcitx::Option<bool> useNativeNumerals{
      this, "UseNativeNumerals", "Use native numerals", true};
  fcitx::Option<bool> includeInherentVowel{
      this, "IncludeInherentVowel", "Include inherent vowel (schwa)", false};

  FCITX_NODISCARD const char *typeName() const override { return "LipilekhikaConfig"; }
};

class LipilekhikaState : public fcitx::InputContextProperty {
public:
  explicit LipilekhikaState(LipilekhikaEngine *engine, fcitx::InputContext *ic)
      : engine_(engine), ic_(ic) {}
  ~LipilekhikaState() override {
    if (ctx_) {
      lipi_typing_context_free(ctx_);
      ctx_ = nullptr;
    }
  }

  bool ensureContext(const std::string &script);
  void clear();
  void resetContext();
  void rebuildFromRaw();

  LipilekhikaEngine *engine_ = nullptr;
  fcitx::InputContext *ic_ = nullptr;
  LipiTypingContext *ctx_ = nullptr;
  std::string script_;
  std::string raw_ascii_;
  std::string preedit_utf8_;

  // Last applied engine options (for detecting changes).
  uint64_t auto_context_clear_time_ms_ = 0;
  bool use_native_numerals_ = true;
  bool include_inherent_vowel_ = false;
};

class LipilekhikaEngine : public fcitx::InputMethodEngineV2 {
public:
  explicit LipilekhikaEngine(fcitx::Instance *instance);

  void reloadConfig() override;
  const fcitx::Configuration *getConfig() const override;
  void setConfig(const fcitx::RawConfig &config) override;

  const LipilekhikaConfig &config() const { return config_; }

  void keyEvent(const fcitx::InputMethodEntry &entry,
                fcitx::KeyEvent &keyEvent) override;

private:
  void saveConfig() const;
  void refreshAllContexts();

  fcitx::Instance *instance_;
  fcitx::FactoryFor<LipilekhikaState> factory_;
  LipilekhikaConfig config_;
};

class LipilekhikaEngineFactory : public fcitx::AddonFactory {
public:
  fcitx::AddonInstance *create(fcitx::AddonManager *manager) override;
};

#endif // _FCITX5_LIPILEKHIKA_H_

