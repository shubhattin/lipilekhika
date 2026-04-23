<script>
  import MainApp from './MainApp.svelte';
  import {
    input_text_atom,
    typing_script_atom,
    current_preset_atom,
    use_native_numerals_atom,
    include_inherent_vowel_atom
  } from './script/state';
  import PlatformDownload from './PlatformDownload.svelte';
  import { transliterate_wasm, preloadWasm } from 'lipilekhika/index_wasm';
  import { transliterate } from 'lipilekhika';
  import { onMount } from 'svelte';

  let transliterate_func = $state(transliterate);
  onMount(async () => {
    await preloadWasm();
    // replace with wasm version when loaded
    transliterate_func = transliterate_wasm;
  });

  let to_script = $state('Romanized');
</script>

<MainApp
  bind:input_text={$input_text_atom}
  bind:typing_script={$typing_script_atom}
  bind:to_script
  bind:current_preset={$current_preset_atom}
  bind:useNativeNumerals={$use_native_numerals_atom}
  bind:includeInherentVowel={$include_inherent_vowel_atom}
  {transliterate_func}
>
  {#snippet pwa_snippet()}
    <div class="mt-8">
      <PlatformDownload />
    </div>
  {/snippet}
</MainApp>
