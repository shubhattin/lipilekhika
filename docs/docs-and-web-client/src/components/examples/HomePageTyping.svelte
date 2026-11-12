<script lang="ts">
  import { Textarea } from '~/lib/components/ui/textarea';
  import {
    createTypingContext,
    handleTypingBeforeInputEvent,
    clearTypingContextOnKeyDown
  } from 'lipilekhika/typing';
  import { getFontClass } from '$components/script/font_list';
  import { input_text_atom, typing_script_atom } from '$components/script/state';
  import { Icon } from 'svelte-icons-pack';
  import { BiHelpCircle } from 'svelte-icons-pack/bi';
  import { ArrowRight } from 'lucide-svelte';
  import Button from '~/lib/components/ui/button/button.svelte';
  import ScriptSelector from '$components/script/ScriptSelector.svelte';
  import CopyButton from '$components/CopyButton.svelte';

  let textarea_typing_context = $derived(createTypingContext($typing_script_atom));

  let typing_modal_open = $state(false);

  $effect(() => {
    textarea_typing_context.ready;
  });
</script>

<div class="mb-3 flex items-center justify-between">
  <div class="flex items-center gap-2">
    <span
      class="inline-block size-5 bg-contain bg-center bg-no-repeat"
      style="background-image: url('/favicon.svg');"
      aria-label="Lipi Lekhika"
      role="img"
    ></span>
    <p class="text-sm font-semibold text-foreground">Try typing</p>
  </div>
  <a
    href="/app"
    class="group inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
  >
    Open full app
    <ArrowRight class="size-3.5 transition-transform group-hover:translate-x-0.5" />
  </a>
</div>
<div class="space-y-3">
  <div class="flex items-center gap-2">
    <span class="hidden shrink-0 text-xs font-semibold text-muted-foreground sm:inline-block"
      >Script:</span
    >
    <ScriptSelector bind:script={$typing_script_atom} have_normal_script={false} />
    <div class="ml-auto flex items-center gap-1">
      <CopyButton text={() => $input_text_atom} />
      {#if $typing_script_atom !== 'Normal'}
        <Button
          variant="ghost"
          size="icon"
          class="size-8"
          onclick={() => (typing_modal_open = true)}
          title="Typing help"
        >
          <Icon src={BiHelpCircle} className="size-6 fill-sky-500 dark:fill-sky-400" />
          <span class="sr-only">Typing Help</span>
        </Button>
      {/if}
    </div>
  </div>

  <Textarea
    autocomplete="off"
    spellcheck="false"
    autocapitalize="none"
    aria-label="Try typing"
    placeholder={`Type with English letters to write in ${$typing_script_atom}…`}
    class={'min-h-28 resize-none border-border/50 bg-background/50 text-lg transition-colors placeholder:text-base placeholder:text-muted-foreground/60 focus:bg-background md:text-lg ' +
      getFontClass($typing_script_atom)}
    bind:value={$input_text_atom}
    onbeforeinput={(e) =>
      handleTypingBeforeInputEvent(textarea_typing_context, e, (newValue) =>
        input_text_atom.set(newValue)
      )}
    onblur={() => textarea_typing_context.clearContext()}
    onkeydown={(e) => clearTypingContextOnKeyDown(e, textarea_typing_context)}
  />
</div>

{#if typing_modal_open && $typing_script_atom !== 'Normal'}
  {#await import('../TypingHelper.svelte') then { default: TypingHelper }}
    <TypingHelper bind:open={typing_modal_open} script={$typing_script_atom} />
  {/await}
{/if}
