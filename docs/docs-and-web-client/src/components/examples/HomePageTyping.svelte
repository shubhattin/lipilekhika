<script lang="ts">
  import { Textarea } from '$lib/components/ui/textarea';
  import {
    createTypingContext,
    handleTypingBeforeInputEvent,
    clearTypingContextOnKeyDown
  } from 'lipilekhika/typing';
  import { getFontClass } from '$components/script/font_list';
  import { input_text_atom, typing_script_atom } from '$components/script/state';
  import { Icon } from 'svelte-icons-pack';
  import { BiHelpCircle } from 'svelte-icons-pack/bi';
  import { BsCopy } from 'svelte-icons-pack/bs';
  import Button from '$lib/components/ui/button/button.svelte';
  import ScriptSeleector from '$components/script/ScriptSelector.svelte';

  let textarea_typing_context = $derived(createTypingContext($typing_script_atom));

  let typing_modal_open = $state(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  $effect(() => {
    textarea_typing_context.ready;
  });
</script>

<div class="mb-3 flex items-center justify-between">
  <div class="flex items-center gap-2">
    <img src="/main.png" alt="Lipi Lekhika" class="size-5" />
    <p class="text-sm font-semibold text-foreground">Try typing</p>
  </div>
  <a href="/app" class="text-xs text-muted-foreground transition-colors hover:text-foreground">
    Open full app
  </a>
</div>
<div class="space-y-3">
  <div class="flex items-center gap-2">
    <span class="hidden shrink-0 text-xs font-semibold text-muted-foreground sm:inline-block"
      >Script:</span
    >
    <ScriptSeleector bind:script={$typing_script_atom} />
    <Button
      variant="ghost"
      size="icon"
      class="size-8"
      onclick={() => copyToClipboard($input_text_atom)}
      title="Copy text"
    >
      <Icon src={BsCopy} className="size-4" />
      <span class="sr-only">Copy text</span>
    </Button>
    <Button variant="ghost" size="icon" class="size-8" onclick={() => (typing_modal_open = true)}>
      <Icon src={BiHelpCircle} className="size-6 fill-sky-500 dark:fill-sky-400" />
      <span class="sr-only">Typing Help</span>
    </Button>
  </div>

  <Textarea
    placeholder={`Start typing to see realtime transliteration in ${$typing_script_atom}...`}
    class={'min-h-24 resize-none border-border/50 bg-background/50 text-base transition-colors placeholder:text-muted-foreground/60 focus:bg-background ' +
      getFontClass($typing_script_atom)}
    bind:value={$input_text_atom}
    onbeforeinput={(e) =>
      handleTypingBeforeInputEvent(textarea_typing_context, e, (newValue) =>
        input_text_atom.set(newValue)
      )}
    onblur={() => textarea_typing_context.clearContext()}
    onkeydown={(e) => clearTypingContextOnKeyDown(e, textarea_typing_context)}
  />
  <a href="/app" class="w-full text-xs text-muted-foreground hover:text-foreground"
    >Convert text in App</a
  >
</div>

{#if typing_modal_open}
  {#await import('../TypingHelper.svelte') then { default: TypingHelper }}
    <TypingHelper bind:open={typing_modal_open} script={$typing_script_atom} />
  {/await}
{/if}
