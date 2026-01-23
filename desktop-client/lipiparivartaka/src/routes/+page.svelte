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

  const KEY = 'scripts';
  let input_text = $state('');

  const DEFAULT_FROM = 'Devanagari';
  const DEFAULT_TO = 'Romanized';

  let typing_script = $state<ScriptListType>(DEFAULT_FROM);
  let to_script = $state<ScriptListType>(DEFAULT_TO);

  let store: Awaited<ReturnType<typeof Store.load>> | null = null;

  onMount(async () => {
    store = await Store.load('parivartaka_conf.json');

    const value = await store.get<{ from: ScriptListType; to: ScriptListType }>(KEY);
    typing_script = value?.from ?? DEFAULT_FROM;
    to_script = value?.to ?? DEFAULT_TO;
  });

  $effect(() => {
    typing_script;
    to_script;
    if (!!store) {
      store.set(KEY, { from: typing_script, to: to_script });
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

<MainApp bind:input_text bind:typing_script bind:to_script {transliterate_func} />
