<script lang="ts">
  import { Textarea } from '$lib/components/ui/textarea';
  import * as Select from '$lib/components/ui/select';
  import { SCRIPT_LIST, type ScriptListType } from '../../../../../packages/js/src/index';
  import {
    createTypingContext,
    handleTypingBeforeInputEvent,
    clearTypingContextOnKeyDown
  } from '../../../../../packages/js/src/typing';
  import Button from '$lib/components/ui/button/button.svelte';

  let script = $state<ScriptListType>('Devanagari');
  let textarea_text = $state('');

  let textarea_typing_context = $derived(createTypingContext(script));

  $effect(() => {
    textarea_typing_context.ready;
  });
</script>

<div class="space-y-3">
  <div class="flex items-center gap-2">
    <span class="shrink-0 text-xs font-semibold text-muted-foreground">Script:</span>
    <Select.Root type="single" bind:value={script}>
      <Select.Trigger
        id="homepage-typing-script"
        class="h-8 flex-1 border-border/50 bg-background/50 text-sm"
      >
        {script}
      </Select.Trigger>
      <Select.Content class="max-h-60">
        {#each SCRIPT_LIST as s (s)}
          <Select.Item value={s} label={s} />
        {/each}
      </Select.Content>
    </Select.Root>
  </div>

  <Textarea
    placeholder={`Start typing to see realtime transliteration in ${script}...`}
    class="min-h-24 resize-none border-border/50 bg-background/50 text-base transition-colors placeholder:text-muted-foreground/60 focus:bg-background"
    bind:value={textarea_text}
    onbeforeinput={(e) =>
      handleTypingBeforeInputEvent(
        textarea_typing_context,
        e,
        (newValue) => (textarea_text = newValue)
      )}
    onblur={() => textarea_typing_context.clearContext()}
    onkeydown={(e) => clearTypingContextOnKeyDown(e, textarea_typing_context)}
  />
  <a
    href="/app"
    onclick={(e) => {
      (globalThis as any).lipi_tmp_text = textarea_text;
      // works with view transition to preserve the state
    }}
    class="w-full text-xs text-muted-foreground hover:text-foreground">Convert text in App</a
  >
</div>
