<script lang="ts">
  import { Textarea } from '$lib/components/ui/textarea';
  import * as Select from '$lib/components/ui/select';
  import { Label } from '$lib/components/ui/label';
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

<div>
  <div class="flex flex-col gap-2.5 pb-3">
    <Label>
      <Select.Root type="single" bind:value={script}>
        <Select.Trigger id="homepage-typing-script" class="w-full">
          {script}
        </Select.Trigger>
        <Select.Content>
          {#each SCRIPT_LIST as s (s)}
            <Select.Item value={s} label={s} />
          {/each}
        </Select.Content>
      </Select.Root>
    </Label>
  </div>

  <Textarea
    placeholder={`Type in ${script}...`}
    class="h-20 sm:h-30"
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
