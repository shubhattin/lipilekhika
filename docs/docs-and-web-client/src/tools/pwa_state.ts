import { atom } from 'nanostores';

// Non-standard but widely supported event in Chromium-based browsers
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  platforms?: string[];
};

export const pwa_state_atom = atom<{
  install_event_fired: boolean;
  event_triggerer: BeforeInstallPromptEvent | null;
  is_installed: boolean;
}>({
  install_event_fired: false,
  event_triggerer: null,
  is_installed: false
});

// Detect iOS Safari specifically (not other iOS browsers)
export const is_ios_safari_atom = atom<boolean>(
  (() => {
    if (typeof window === 'undefined') return false;

    const userAgent = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent);

    return isIOS && isSafari;
  })()
);

export const is_ios_atom = atom<boolean>(
  (() => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(window.navigator.userAgent);
  })()
);

// Platform detection for download prompts
export type Platform = 'android' | 'windows' | 'linux' | 'chromeos' | 'ios' | 'macos' | 'unknown';

export const detect_platform = (): Platform => {
  if (typeof window === 'undefined') return 'unknown';

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() || '';

  // Check Android first (before Linux since Android UA contains 'linux')
  if (/android/.test(userAgent)) {
    return 'android';
  }

  // Check iOS
  if (/ipad|iphone|ipod/.test(userAgent)) {
    return 'ios';
  }

  // Check macOS (iPadOS Safari says it is a Mac: a Mac with a touch screen is an iPad)
  if (/macintosh|macintel|mac os x/.test(userAgent) || platform.includes('mac')) {
    return window.navigator.maxTouchPoints > 1 ? 'ios' : 'macos';
  }

  // Check Windows
  if (/windows|win32|win64/.test(userAgent) || platform.includes('win')) {
    return 'windows';
  }

  // Check ChromeOS (before Linux: its user agent has `X11; CrOS`)
  if (/\bcros\b/.test(userAgent)) {
    return 'chromeos';
  }

  // Check Linux (after Android check)
  if (/linux|x11/.test(userAgent) || platform.includes('linux')) {
    return 'linux';
  }

  return 'unknown';
};
