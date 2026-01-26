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

#include <string>

#include "lipilekhika_typing.h"

class LipilekhikaState : public fcitx::InputContextProperty {
public:
  explicit LipilekhikaState(fcitx::InputContext *ic) : ic_(ic) {}
  ~LipilekhikaState() override {
    if (ctx_) {
      lipi_typing_context_free(ctx_);
      ctx_ = nullptr;
    }
  }

  bool ensureContext(const std::string &script);
  void clear();
  void rebuildFromRaw();

  fcitx::InputContext *ic_ = nullptr;
  LipiTypingContext *ctx_ = nullptr;
  std::string script_;
  std::string raw_ascii_;
  std::string preedit_utf8_;
};

class LipilekhikaEngine : public fcitx::InputMethodEngineV2 {
public:
  explicit LipilekhikaEngine(fcitx::Instance *instance);

  void keyEvent(const fcitx::InputMethodEntry &entry,
                fcitx::KeyEvent &keyEvent) override;

private:
  fcitx::Instance *instance_;
  fcitx::FactoryFor<LipilekhikaState> factory_;
};

class LipilekhikaEngineFactory : public fcitx::AddonFactory {
public:
  fcitx::AddonInstance *create(fcitx::AddonManager *manager) override;
};

#endif // _FCITX5_LIPILEKHIKA_H_

