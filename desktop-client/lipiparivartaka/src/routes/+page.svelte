<script lang="ts">
  import MainApp from '$components/MainApp.svelte';
  import {
    transliterate,
    type ScriptListType,
    type TransliterationOptions,
    type ScriptLangType
  } from 'lipilekhika';
  import { invoke } from '@tauri-apps/api/core';
  import { Store } from '@tauri-apps/plugin-store';
  import { onMount } from 'svelte';
  import { type PresetListType } from '~/tools/presets';
  import { DEFAULT_USE_NATIVE_NUMERALS, DEFAULT_INCLUDE_INHERENT_VOWEL } from 'lipilekhika/typing';

  const KEY = 'scripts';
  let input_text = $state('');

  const DEFAULT_FROM = 'Devanagari';
  const DEFAULT_TO = 'Romanized';

  let typing_script = $state<ScriptListType>(DEFAULT_FROM);
  let to_script = $state<ScriptListType>(DEFAULT_TO);
  let use_native_numerals = $state(DEFAULT_USE_NATIVE_NUMERALS);
  let include_inherent_vowel = $state(DEFAULT_INCLUDE_INHERENT_VOWEL);
  let current_preset = $state<PresetListType>('none');

  let store: Awaited<ReturnType<typeof Store.load>> | null = null;

  onMount(async () => {
    store = await Store.load('parivartaka_conf.json');

    const value = await store.get<{
      from: ScriptListType;
      to: ScriptListType;
      use_native_numerals: boolean;
      include_inherent_vowel: boolean;
      preset: PresetListType;
    }>(KEY);
    typing_script = value?.from ?? DEFAULT_FROM;
    to_script = value?.to ?? DEFAULT_TO;
    current_preset = value?.preset ?? 'none';
    use_native_numerals = value?.use_native_numerals ?? DEFAULT_USE_NATIVE_NUMERALS;
    include_inherent_vowel = value?.include_inherent_vowel ?? DEFAULT_INCLUDE_INHERENT_VOWEL;
  });

  $effect(() => {
    typing_script;
    to_script;
    current_preset;
    use_native_numerals;
    include_inherent_vowel;
    if (!!store) {
      store.set(KEY, {
        from: typing_script,
        to: to_script,
        preset: current_preset,
        use_native_numerals,
        include_inherent_vowel
      });
      store.save();
    }
  });

  const transliterate_func = async (
    text: string,
    from: ScriptLangType,
    to: ScriptLangType,
    options?: TransliterationOptions
  ) => {
    try {
      const result: string = await invoke('transliterate', {
        payload: {
          text: text,
          from: from,
          to: to,
          options: options
        }
      });
      return result;
    } catch {}

    // fallback to js version (like in browser dev mode)
    return await transliterate(text, from, to, options);
  };
</script>

<MainApp
  bind:input_text
  bind:typing_script
  bind:to_script
  bind:current_preset
  bind:useNativeNumerals={use_native_numerals}
  bind:includeInherentVowel={include_inherent_vowel}
  {transliterate_func}
/>
