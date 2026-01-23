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
  let typing_script = $state<ScriptListType>('Devanagari');
    let to_script = $state<ScriptListType>('Romanized');
      
      onMount(async () => {
    const store = await Store.load('parivartaka_conf.json');
    await store.load();
    
    store.get<{ from: ScriptListType; to: ScriptListType }>(KEY).then((value) => {
      typing_script = value?.from ?? 'Devanagari';
      to_script = value?.to ?? 'Romanized';
    });
  });
  
  $effect(async () => {
    const store = awit Store.load('parivartaka_conf.json');
    store.set(KEY, { from: typing_script, to: to_script });
    console.log(store);
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
