import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// this file is supposed to mirror binding/pkg/index.cjs
// so it needs to be in sync with the generated bindings from binding/src/lib.rs

type NativeTypingContextOptionsInput =
  | {
      auto_context_clear_time_ms?: number;
      use_native_numerals?: boolean;
      include_inherent_vowel?: boolean;
    }
  | null
  | undefined;

type TypingDiffOutput = {
  to_delete_chars_count: number;
  diff_add_text: string;
  context_length: number;
};

type NativeTypingContextInstance = {
  clear_context(): void;
  take_key_input(key: string): TypingDiffOutput;
  update_use_native_numerals(useNativeNumerals: boolean): void;
  update_include_inherent_vowel(includeInherentVowel: boolean): void;
  get_use_native_numerals(): boolean;
  get_include_inherent_vowel(): boolean;
  get_normalized_script(): string;
};

export type NativeModule = {
  NativeTypingContext: new (
    typingLang: string,
    options?: NativeTypingContextOptionsInput
  ) => NativeTypingContextInstance;
  transliterate: (
    text: string,
    from: string,
    to: string,
    transOptions?: Record<string, boolean> | null
  ) => string;
};

const requireNativeModule = createRequire(import.meta.url);
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OVERRIDE_ENV_VARS = [
  'LIPILEKHIKA_NATIVE_LIBRARY_PATH',
  'NAPI_RS_NATIVE_LIBRARY_PATH'
] as const;
const SUPPORTED_BINARY_FILES = {
  linux: {
    x64: {
      gnu: 'index.linux-x64-gnu.node',
      musl: 'index.linux-x64-musl.node'
    },
    arm64: {
      gnu: 'index.linux-arm64-gnu.node',
      musl: 'index.linux-arm64-musl.node'
    }
  },
  darwin: {
    x64: 'index.darwin-x64.node',
    arm64: 'index.darwin-arm64.node'
  },
  win32: {
    x64: 'index.win32-x64-msvc.node',
    arm64: 'index.win32-arm64-msvc.node'
  }
} as const;

type LinuxLibc = 'gnu' | 'musl';
type ProcessReportWithHeader = {
  header?: {
    glibcVersionRuntime?: string;
  };
};

let nativeBinding: NativeModule | null = null;

export function loadNativeBinding(): NativeModule {
  if (nativeBinding) {
    return nativeBinding;
  }

  const nativeBinaryPath = resolveNativeBinaryPath();
  if (!existsSync(nativeBinaryPath)) {
    throw new Error(
      `Missing native Lipilekhika binary at ${nativeBinaryPath}. ` +
        'The package may be incomplete, or a bundler may have omitted the native asset files.'
    );
  }

  try {
    nativeBinding = requireNativeModule(nativeBinaryPath) as NativeModule;
    return nativeBinding;
  } catch (cause) {
    throw new Error(`Failed to load native Lipilekhika binary from ${nativeBinaryPath}.`, {
      cause
    });
  }
}

function resolveNativeBinaryPath() {
  for (const envVarName of OVERRIDE_ENV_VARS) {
    const overridePath = process.env[envVarName];
    if (overridePath) {
      return overridePath;
    }
  }

  const nativeBinaryFileName = getNativeBinaryFileName();
  for (const nativeDir of getNativeDirCandidates()) {
    const nativeBinaryPath = path.join(nativeDir, nativeBinaryFileName);
    if (existsSync(nativeBinaryPath)) {
      return nativeBinaryPath;
    }
  }

  return path.join(getNativeDirCandidates()[0], nativeBinaryFileName);
}

function getNativeBinaryFileName(): string {
  const platformBinaries =
    SUPPORTED_BINARY_FILES[process.platform as keyof typeof SUPPORTED_BINARY_FILES];
  const archBinaries = platformBinaries?.[process.arch as keyof typeof platformBinaries];

  if (!archBinaries) {
    throw new Error(
      `Unsupported platform for Lipilekhika native binding: ${process.platform}-${process.arch}. ` +
        `Supported targets: ${getSupportedTargetList()}.`
    );
  }

  if (typeof archBinaries === 'string') {
    return archBinaries;
  }

  if (process.platform === 'linux') {
    return archBinaries[getLinuxLibc()];
  }

  throw new Error(
    `Unsupported platform for Lipilekhika native binding: ${process.platform}-${process.arch}. ` +
      `Supported targets: ${getSupportedTargetList()}.`
  );
}

function getLinuxLibc(): LinuxLibc {
  const report = process.report?.getReport() as ProcessReportWithHeader | undefined;
  return report?.header?.glibcVersionRuntime ? 'gnu' : 'musl';
}

function getSupportedTargetList() {
  return Object.entries(SUPPORTED_BINARY_FILES)
    .flatMap(([platform, arches]) =>
      Object.entries(arches).flatMap(([arch, binary]) =>
        typeof binary === 'object'
          ? Object.keys(binary).map((libc) => `${platform}-${arch}-${libc}`)
          : `${platform}-${arch}`
      )
    )
    .join(', ');
}

function getNativeDirCandidates() {
  return [path.join(CURRENT_DIR, '..', 'native'), path.join(CURRENT_DIR, '..', 'binding', 'pkg')];
}
