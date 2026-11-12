<script lang="ts">
  import { Textarea } from '~/lib/components/ui/textarea';
  import {
    createTypingContext,
    handleTypingBeforeInputEvent,
    clearTypingContextOnKeyDown
  } from 'lipilekhika/typing';

  const DEFAULT_SCRIPT = 'Devanagari';
  let textarea_text = $state('');

  let textarea_typing_context = $derived(createTypingContext(DEFAULT_SCRIPT));

  $effect(() => {
    textarea_typing_context.ready;
  });
</script>

<Textarea
  autocomplete="off"
  spellcheck="false"
  autocapitalize="none"
  placeholder="Type in देवनागरी..."
  class="h-20 border-(--sl-color-gray-5) bg-transparent text-(--sl-color-white) shadow-none transition-colors placeholder:text-(--sl-color-gray-3) hover:border-(--sl-color-gray-4) focus-visible:border-(--sl-color-gray-3) focus-visible:ring-0 sm:h-30 dark:bg-transparent"
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
