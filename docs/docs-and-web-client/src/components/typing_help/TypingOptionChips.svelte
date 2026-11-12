<!--
  Quick toggles for the typing options, shown inside the source text box. Each shows what
  typing a key gives right now (`k → क्`, `1 → १`) in the current script, so the state is
  visible at a glance; a click flips it (the mousedown is cancelled so the text box keeps
  focus). The full options stay in the settings popover.
-->
<script lang="ts">
  import type { ScriptListType } from 'lipilekhika';
  import { getFontClass } from '$components/script/font_list';
  import { getTypingOptionExamples, type TypingOptionExamples } from './option_examples';
  import { Toggle } from '~/lib/components/ui/toggle';
  import { cn } from '~/lib/utils.js';
  import { PILL_TOGGLE } from './pill';

  let {
    script,
    useNativeNumerals = $bindable(),
    includeInherentVowel = $bindable(),
    class: className = ''
  }: {
    script: ScriptListType;
    useNativeNumerals: boolean;
    includeInherentVowel: boolean;
    class?: string;
  } = $props();

  let examples = $state<TypingOptionExamples | null>(null);
  $effect(() => {
    const for_script = script;
    getTypingOptionExamples(for_script)
      .then((e) => {
        if (for_script === script) examples = e;
      })
      .catch(() => (examples = null));
  });
</script>

{#if examples && (examples.vowel || examples.numerals)}
  <div class={cn('flex items-center gap-1.5', className)}>
    {#if examples.vowel}
      {@const result = includeInherentVowel ? examples.vowel.on : examples.vowel.off}
      <Toggle
        bind:pressed={includeInherentVowel}
        class={PILL_TOGGLE}
        aria-label="Inherent vowel: {includeInherentVowel ? 'on' : 'off'}"
        title={includeInherentVowel
          ? `Inherent vowel on: k types ${examples.vowel.on}. Click to type ${examples.vowel.off}`
          : `Inherent vowel off: k types ${examples.vowel.off}. Click to type ${examples.vowel.on}`}
        onmousedown={(e) => e.preventDefault()}
      >
        <span class="font-mono text-[0.7rem]">k</span>
        <span aria-hidden="true" class="opacity-60">→</span>
        <span class={cn('text-sm leading-none', getFontClass(script))}>{result}</span>
      </Toggle>
    {/if}
    {#if examples.numerals}
      {@const result = useNativeNumerals ? examples.numerals.on : examples.numerals.off}
      <Toggle
        bind:pressed={useNativeNumerals}
        class={PILL_TOGGLE}
        aria-label="Native numerals: {useNativeNumerals ? 'on' : 'off'}"
        title={useNativeNumerals
          ? `Native numerals on: 1 types ${examples.numerals.on}. Click to keep 1`
          : `Native numerals off: 1 stays 1. Click to type ${examples.numerals.on}`}
        onmousedown={(e) => e.preventDefault()}
      >
        <span class="font-mono text-[0.7rem]">1</span>
        <span aria-hidden="true" class="opacity-60">→</span>
        <span class={cn('text-sm leading-none', useNativeNumerals && getFontClass(script))}
          >{result}</span
        >
      </Toggle>
    {/if}
  </div>
{/if}
