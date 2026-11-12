<!--
  A text box's less used actions (open or save a .txt file) behind a ⋯ button, so the row
  above the box keeps only what is used all the time. Used where that row is short (phones).
-->
<script lang="ts">
  import type { Component } from 'svelte';
  import { Button } from '~/lib/components/ui/button';
  import * as Popover from '~/lib/components/ui/popover';
  import { Ellipsis } from 'lucide-svelte';
  import { cn } from '~/lib/utils.js';

  type Item = {
    label: string;
    // lucide-svelte's icons are typed as legacy components
    icon: Component<{ class?: string }> | typeof Ellipsis;
    onclick: () => void;
    disabled?: boolean;
    /** shown on the right, e.g. `Ctrl+S` */
    shortcut?: string;
  };

  let {
    label,
    items,
    hint,
    class: className = ''
  }: {
    /** what the button is for, e.g. "More actions for the source text" */
    label: string;
    items: Item[];
    /** a small line under the items */
    hint?: string;
    /** for the ⋯ button */
    class?: string;
  } = $props();

  let open = $state(false);

  const ITEM =
    'flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50';
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="ghost" size="icon" class={cn('size-8', className)} title={label}>
        <Ellipsis class="size-4" />
        <span class="sr-only">{label}</span>
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-60 p-1" align="start">
    {#each items as item (item.label)}
      <button
        type="button"
        class={ITEM}
        disabled={item.disabled}
        onclick={() => {
          open = false;
          item.onclick();
        }}
      >
        <item.icon class="size-4 text-muted-foreground" />
        {item.label}
        {#if item.shortcut}
          <kbd class="ml-auto font-sans text-xs text-muted-foreground">{item.shortcut}</kbd>
        {/if}
      </button>
    {/each}
    {#if hint}
      <p class="mt-1 border-t px-2 pt-1.5 pb-1 text-xs text-muted-foreground">{hint}</p>
    {/if}
  </Popover.Content>
</Popover.Root>
