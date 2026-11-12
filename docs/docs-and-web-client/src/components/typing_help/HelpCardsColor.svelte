<script lang="ts">
  import type { ScriptListType } from 'lipilekhika';
  import HelpCards from './HelpCards.svelte';

  /** Help 4: the cards of Help 2 with the colours of Help 1 */
  let { open = $bindable(), script }: { open: boolean; script: ScriptListType } = $props();
</script>

<HelpCards bind:open {script} colorful variant_label="Help 4 · Colour cards" />
