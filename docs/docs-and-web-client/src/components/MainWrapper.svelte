<script>
  import MainApp from './MainApp.svelte';
  import { input_text_atom, typing_script_atom, current_preset_atom } from './script/state';
  import PlatformDownload from './PlatformDownload.svelte';
  import { transliterate } from 'lipilekhika';

  let to_script = $state('Romanized');
</script>

<MainApp
  bind:input_text={$input_text_atom}
  bind:typing_script={$typing_script_atom}
  bind:to_script
  bind:current_preset={$current_preset_atom}
  transliterate_func={transliterate}
>
  {#snippet pwa_snippet()}
    <div class="mt-8">
      <PlatformDownload />
    </div>
  {/snippet}
</MainApp>
