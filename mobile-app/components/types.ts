import type { ScriptListType, TransliterationOptions } from "lipilekhika";

/**
 * Props for the ScriptSelector component
 */
export interface ScriptSelectorProps {
  script: ScriptListType;
  onScriptChange: (script: ScriptListType) => void;
}

/**
 * Props for the CustomOptions component
 */
export interface CustomOptionsProps {
  availableOptions: string[];
  options: TransliterationOptions;
  onOptionsChange: (options: TransliterationOptions) => void;
}

/**
 * Props for the SettingsPopover component
 */
export interface SettingsPopoverProps {
  visible: boolean;
  onClose: () => void;
  useNativeNumerals: boolean;
  onUseNativeNumeralsChange: (value: boolean) => void;
  includeInherentVowel: boolean;
  onIncludeInherentVowelChange: (value: boolean) => void;
}

/**
 * Props for the TypingHelper modal
 */
export interface TypingHelperProps {
  visible: boolean;
  onClose: () => void;
  script: ScriptListType;
}

/**
 * Custom option description type
 */
export type CustomOptionDescription = Record<
  keyof TransliterationOptions,
  [name: string, description: string]
>;
