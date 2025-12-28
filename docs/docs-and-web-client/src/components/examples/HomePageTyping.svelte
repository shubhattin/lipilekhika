<script lang="ts">
  import { Textarea } from '$lib/components/ui/textarea';
  import * as Select from '$lib/components/ui/select';
  import { SCRIPT_LIST, type ScriptListType } from '../../../../../packages/js/src/index';
  import {
    createTypingContext,
    handleTypingBeforeInputEvent,
    clearTypingContextOnKeyDown
  } from '../../../../../packages/js/src/typing';

  let script = $state<ScriptListType>('Devanagari');
  let textarea_text = $state('');

  let textarea_typing_context = $derived(createTypingContext(script));

  $effect(() => {
    textarea_typing_context.ready;
  });
</script>

<div class="space-y-3">
  <div class="flex items-center gap-2">
    <span class="text-xs text-muted-foreground shrink-0 font-semibold">Script:</span>
    <Select.Root type="single" bind:value={script}>
      <Select.Trigger
        id="homepage-typing-script"
        class="h-8 flex-1 bg-background/50 border-border/50 text-sm"
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
    class="min-h-24 resize-none bg-background/50 border-border/50 text-base placeholder:text-muted-foreground/60 focus:bg-background transition-colors"
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
</div>
