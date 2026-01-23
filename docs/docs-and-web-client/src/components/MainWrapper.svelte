<script>
  import MainApp from './MainApp.svelte';
  import { input_text_atom, typing_script_atom } from './script/state';
  import PWAInstall from './PWAInstall.svelte';
  import { transliterate } from 'lipilekhika';

  let to_script = $state('Romanized');
</script>

<MainApp
  bind:input_text={$input_text_atom}
  bind:typing_script={$typing_script_atom}
  bind:to_script
  transliterate_func={transliterate}
>
  {#snippet pwa_snippet()}
    <div class="mt-8">
      <PWAInstall />
    </div>
  {/snippet}
</MainApp>
