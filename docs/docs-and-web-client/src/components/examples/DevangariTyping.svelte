<script lang="ts">
  import { Textarea } from '$lib/components/ui/textarea';
  import {
    createTypingContext,
    handleTypingBeforeInputEvent,
    clearTypingContextOnKeyDown
  } from '../../../../../packages/js/src/typing';

  const DEFAULT_SCRIPT = 'Devanagari';
  let textarea_text = $state('');

  let textarea_typing_context = $derived(createTypingContext(DEFAULT_SCRIPT));

  $effect(() => {
    textarea_typing_context.ready;
  });
</script>

<Textarea
  placeholder="Type in देवनागरी..."
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
