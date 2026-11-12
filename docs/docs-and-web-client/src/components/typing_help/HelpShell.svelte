<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ScriptListType } from 'lipilekhika';
  import * as Dialog from '~/lib/components/ui/dialog';
  import * as Tabs from '~/lib/components/ui/tabs';
  import { Skeleton } from '~/lib/components/ui/skeleton';
  import { cn } from '~/lib/utils';
  import { Keyboard, Map as MapIcon, ArrowLeftRight, Search, X } from 'lucide-svelte';
  import ScriptSelector from '../script/ScriptSelector.svelte';
  import { getFontClass } from '../script/font_list';
  import { buildLayout, type HelpContext } from './layout';

  let {
    open = $bindable(),
    script: script_input,
    variant_label,
    content_class,
    searchable = false,
    body
  }: {
    open: boolean;
    script: ScriptListType;
    /** shown next to the title while the variants are being compared */
    variant_label?: string;
    content_class?: string;
    searchable?: boolean;
    body: Snippet<[HelpContext]>;
  } = $props();

  // svelte-ignore state_referenced_locally
  let script = $state<ScriptListType>(script_input === 'Normal' ? 'Devanagari' : script_input);
  let compare = $state<ScriptListType>('Romanized');
  let tab = $state<'typing' | 'compare'>('typing');
  let show_alternates = $state(true);
  let query = $state('');

  let layout_prom = $derived(tab === 'typing' ? buildLayout(script) : buildLayout(script, compare));
</script>

<Dialog.Root bind:open>
  <Dialog.Content
    class={cn(
      'flex h-[92dvh] max-h-[92dvh] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[88vh] sm:w-[calc(100vw-2rem)] sm:max-w-4xl',
      content_class
    )}
    onOpenAutoFocus={(e) => e.preventDefault()}
  >
    <div class="flex items-center gap-2 border-b px-4 py-3 pr-12 sm:px-5">
      <Keyboard class="size-5 shrink-0 text-primary" />
      <Dialog.Title class="text-base font-semibold sm:text-lg">Typing help</Dialog.Title>
      {#if variant_label}
        <span
          class="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase"
        >
          {variant_label}
        </span>
      {/if}
    </div>

    <Tabs.Root bind:value={tab} class="flex min-h-0 flex-1 flex-col gap-0">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2.5 border-b px-4 py-3 sm:px-5">
        <ScriptSelector bind:script have_normal_script={false} />
        <!-- on small screens the tabs take a full row under the script and the checkbox -->
        <Tabs.List class="order-last grid h-9 w-full grid-cols-2 sm:order-none sm:w-auto">
          <Tabs.Trigger value="typing" class="gap-1.5 px-3 text-sm">
            <MapIcon class="size-3.5" />
            Typing map
          </Tabs.Trigger>
          <Tabs.Trigger value="compare" class="gap-1.5 px-3 text-sm">
            <ArrowLeftRight class="size-3.5" />
            Compare
          </Tabs.Trigger>
        </Tabs.List>
        {#if tab === 'compare'}
          <div class="order-last flex w-full items-center gap-2 sm:order-none sm:w-auto">
            <span class="text-sm text-muted-foreground">with</span>
            <ScriptSelector bind:script={compare} have_normal_script={true} />
          </div>
        {:else}
          <label
            class="ml-auto flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm text-muted-foreground select-none hover:text-foreground"
          >
            <input type="checkbox" class="size-4 accent-primary" bind:checked={show_alternates} />
            <span class="sm:hidden">Alternates</span>
            <span class="hidden sm:inline">Alternate keys</span>
          </label>
        {/if}
        {#if searchable}
          <div class="relative order-last w-full">
            <Search
              class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              bind:value={query}
              placeholder="Find a key (kh, .A) or a character"
              autocomplete="off"
              spellcheck="false"
              class="h-9 w-full rounded-md border border-input bg-transparent pr-8 pl-8 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
            />
            {#if query}
              <button
                type="button"
                class="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
                onclick={() => (query = '')}
              >
                <X class="size-4" />
              </button>
            {/if}
          </div>
        {/if}
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        {#await layout_prom}
          <div class="space-y-6" aria-label="Loading">
            {#each [10, 15, 8] as count, s (s)}
              <div>
                <Skeleton class="mb-3 h-5 w-32" />
                <div class="grid grid-cols-5 gap-2">
                  {#each Array.from({ length: count }) as _, i (i)}
                    <Skeleton class="h-14" />
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {:then layout}
          {@render body({
            layout,
            mode: tab,
            show_alternates,
            query,
            font: getFontClass(script),
            other_font: getFontClass(compare)
          })}
        {:catch err}
          <div class="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p class="font-medium text-destructive">Could not load the typing help</p>
            <p class="mt-1 text-xs text-muted-foreground">{String(err)}</p>
          </div>
        {/await}
      </div>
    </Tabs.Root>
  </Dialog.Content>
</Dialog.Root>
