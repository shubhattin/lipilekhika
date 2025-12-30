<script lang="ts">
  import { Textarea } from '$lib/components/ui/textarea';
  import * as Select from '$lib/components/ui/select';
  import { SCRIPT_LIST, type ScriptListType } from '$lipilekhika/index';
  import {
    createTypingContext,
    handleTypingBeforeInputEvent,
    clearTypingContextOnKeyDown
  } from '$lipilekhika/typing';
  import { input_text_atom, typing_script_atom } from '~/components/landing/state';
  import { Icon } from 'svelte-icons-pack';
  import { BiHelpCircle } from 'svelte-icons-pack/bi';
  import Button from '$lib/components/ui/button/button.svelte';

  let textarea_typing_context = $derived(createTypingContext($typing_script_atom));

  let typing_modal_open = $state(false);

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
    <span class="shrink-0 text-xs font-semibold text-muted-foreground">Script:</span>
    <Select.Root type="single" bind:value={$typing_script_atom}>
      <Select.Trigger
        id="homepage-typing-script"
        class="h-8 w-48 border-border/50 bg-background/50 text-sm"
      >
        {$typing_script_atom}
      </Select.Trigger>
      <Select.Content class="max-h-60">
        {#each SCRIPT_LIST as s (s)}
          <Select.Item value={s} label={s} />
        {/each}
      </Select.Content>
    </Select.Root>
    <Button variant="ghost" size="icon" class="size-8" onclick={() => (typing_modal_open = true)}>
      <Icon src={BiHelpCircle} className="size-6 fill-sky-500 dark:fill-sky-400" />
      <span class="sr-only">Typing Help</span>
    </Button>
  </div>

  <Textarea
    placeholder={`Start typing to see realtime transliteration in ${$typing_script_atom}...`}
    class="min-h-24 resize-none border-border/50 bg-background/50 text-base transition-colors placeholder:text-muted-foreground/60 focus:bg-background"
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
