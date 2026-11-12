<!--
  Buttons on the Script Guide that open the typing help for a script: its typing map, or a
  letter by letter comparison with a related script. Icon buttons in the tables, labelled
  ones (`labelled`) under the detailed sections.
-->
<script lang="ts">
  import type { ScriptListType } from 'lipilekhika';
  import { ArrowLeftRight, Map as MapIcon } from 'lucide-svelte';
  import { cn } from '~/lib/utils.js';

  let { script, labelled = false }: { script: ScriptListType; labelled?: boolean } = $props();

  /**
   * What each script is compared with, as [script shown, compared with]. The first one has
   * to be a typing script, so Normal is shown as the other side of Devanagari.
   */
  const COMPARE: Partial<Record<ScriptListType, [ScriptListType, ScriptListType]>> = {
    Devanagari: ['Devanagari', 'Romanized'],
    'Tamil-Extended': ['Tamil-Extended', 'Tamil'],
    Normal: ['Devanagari', 'Normal'],
    Romanized: ['Romanized', 'IAST'],
    IAST: ['IAST', 'Romanized'],
    ITRANS: ['ITRANS', 'Normal'],
    'Harvard-Kyoto': ['Harvard-Kyoto', 'Normal'],
    SLP1: ['SLP1', 'Normal']
  };

  const pair = $derived(COMPARE[script] ?? ([script, 'Devanagari'] as const));
  const other = $derived(pair[0] === script ? pair[1] : pair[0]);
  // Normal has no typing map of its own: it is what you type with
  const has_map = $derived(script !== 'Normal');

  let open = $state(false);
  let view = $state<{ script: ScriptListType; tab: 'typing' | 'compare'; with: ScriptListType }>({
    script: 'Devanagari',
    tab: 'typing',
    with: 'Romanized'
  });

  const show = (tab: 'typing' | 'compare') => {
    view =
      tab === 'typing'
        ? { script, tab, with: 'Romanized' }
        : { script: pair[0], tab, with: pair[1] };
    open = true;
  };

  const btn = $derived(
    cn(
      'inline-flex items-center justify-center gap-1.5 rounded-md border border-(--sl-color-gray-5) text-(--sl-color-gray-2) transition-colors hover:border-(--sl-color-gray-4) hover:bg-(--sl-color-gray-6) hover:text-(--sl-color-white)',
      labelled ? 'h-8 px-2.5 text-sm' : 'size-7'
    )
  );
</script>

<span class={cn('not-content flex gap-1.5', labelled ? 'mt-3 flex-wrap' : 'mt-1.5')}>
  {#if has_map}
    <button
      type="button"
      class={btn}
      title="Typing map: the keys for each letter of {script}"
      aria-label="{script} typing map"
      onclick={() => show('typing')}
    >
      <MapIcon class="size-3.5" />
      {#if labelled}Typing map{/if}
    </button>
  {/if}
  <button
    type="button"
    class={btn}
    title="Compare {script} with {other}, letter by letter"
    aria-label="Compare {script} with {other}"
    onclick={() => show('compare')}
  >
    <ArrowLeftRight class="size-3.5" />
    {#if labelled}Compare with {other}{/if}
  </button>
</span>

{#if open}
  {#await import('../TypingHelper.svelte') then { default: TypingHelper }}
    <TypingHelper
      bind:open
      script={view.script}
      initial_tab={view.tab}
      initial_compare={view.with}
    />
  {/await}
{/if}
