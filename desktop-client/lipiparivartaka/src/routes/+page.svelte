<script lang="ts">
  import MainApp from '$components/MainApp.svelte';
  import {
    transliterate,
    type ScriptListType,
    type TransliterationOptions,
    type ScriptLangType
  } from 'lipilekhika';
  import { invoke } from '@tauri-apps/api/core';

  const KEYS = {
    from_script: 'parivartaka_local:from_script',
    to_script: 'parivartaka_local:to_script'
  };

  let input_text = $state('');
  let typing_script = $state<ScriptListType>(
    (() => {
      return (localStorage.getItem(KEYS.from_script) as ScriptListType | null) ?? 'Devanagari';
      // return 'Devanagari';
    })()
  );
  let to_script = $state<ScriptListType>(
    (() => {
      return (localStorage.getItem(KEYS.to_script) as ScriptListType | null) ?? 'Romanized';
      // return 'Romanized';
    })()
  );

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

<MainApp bind:input_text bind:typing_script bind:to_script {transliterate_func} />
