<!--
  Script picker: a search box, the sections (with counts) and the scripts.
  Clicking a section jumps to it and the active section follows the scroll.
  Wider screens put the sections on a left rail; phones get a row of tabs above the list.
-->
<script lang="ts">
  import type { ScriptListType } from 'lipilekhika';
  import * as Popover from '~/lib/components/ui/popover';
  import { Skeleton } from '~/lib/components/ui/skeleton';
  import { Command as CommandPrimitive } from 'bits-ui';
  import { Check, Search } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import ScriptSelectorTrigger from './ScriptSelectorTrigger.svelte';
  import ScriptGlyph from './ScriptGlyph.svelte';
  import {
    CATEGORIES,
    CATEGORY_SHORT,
    SCRIPT_CATEGORY,
    SCRIPT_HINT,
    CUSTOM_SCHEMES,
    filterScripts,
    groupByCategory,
    listScripts,
    centerItemInList,
    type CategoryType
  } from './script_meta';
  import { cn } from '~/lib/utils.js';

  let {
    script = $bindable(),
    have_normal_script = true
  }: { script: ScriptListType; have_normal_script?: boolean } = $props();

  let open = $state(false);
  let query = $state('');
  let inputRef = $state<HTMLInputElement | null>(null);
  let highlighted = $state('');
  let listRef = $state<HTMLElement | null>(null);
  let activeCategory = $state<CategoryType>('modern');

  const all = $derived(listScripts(have_normal_script));
  const allGroups = $derived(groupByCategory(all));
  const groups = $derived(groupByCategory(filterScripts(all, query)));
  const visible = $derived(groups.flatMap((g) => g.scripts));
  const countFor = (c: CategoryType) => groups.find((g) => g.category === c)?.scripts.length ?? 0;

  // keep the highlight on a shown item so Enter always picks something visible
  $effect(() => {
    if (open && visible.length && !visible.includes(highlighted as ScriptListType))
      highlighted = visible[0];
  });

  const sectionEl = (c: CategoryType) =>
    listRef?.querySelector<HTMLElement>(`[data-section="${c}"]`);

  const jumpTo = (c: CategoryType) => {
    const el = sectionEl(c);
    if (!el || !listRef) return;
    listRef.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
    activeCategory = c;
  };

  // the active section follows the scroll position
  const onScroll = () => {
    if (!listRef) return;
    const top = listRef.scrollTop + listRef.clientHeight / 3;
    let current: CategoryType = groups[0]?.category ?? 'modern';
    for (const g of groups) {
      const el = sectionEl(g.category);
      if (el && el.offsetTop <= top) current = g.category;
    }
    activeCategory = current;
  };

  const onOpenChange = (o: boolean) => {
    if (!o) return;
    query = '';
    highlighted = script;
    activeCategory = SCRIPT_CATEGORY[script];
  };

  /**
   * The default focus runs before the popover is positioned, which scrolls the page to
   * the top, so focus by hand without scrolling. Only devices with a mouse get the search
   * box focused: on touch screens it would pop up the on-screen keyboard over the list.
   */
  const onOpenAutoFocus = (e: Event) => {
    e.preventDefault();
    setTimeout(() => {
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches)
        inputRef?.focus({ preventScroll: true });
      centerItemInList(listRef, script);
    });
  };

  const choose = (s: ScriptListType) => {
    script = s;
    open = false;
  };

  // The page is prerendered with the default script while the real one can come from
  // localStorage, so show a same-sized placeholder until the client has taken over
  // instead of flashing the wrong script name.
  let mounted = $state(false);
  onMount(() => (mounted = true));
</script>

{#if !mounted}
  <Skeleton
    class="h-9 w-48 border border-border/50 bg-muted/40 dark:bg-input/30"
    aria-hidden="true"
  />
{:else}
  <Popover.Root bind:open {onOpenChange}>
    <Popover.Trigger>
      {#snippet child({ props })}
        <ScriptSelectorTrigger {...props} {script} {open} />
      {/snippet}
    </Popover.Trigger>
    <Popover.Content
      align="start"
      {onOpenAutoFocus}
      collisionPadding={12}
      class="flex h-[min(24rem,calc(var(--bits-popover-content-available-height)-0.5rem))] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden p-0 sm:h-[min(30rem,calc(var(--bits-popover-content-available-height)-1rem))]"
    >
      <CommandPrimitive.Root
        shouldFilter={false}
        disableInitialScroll
        loop
        bind:value={highlighted}
        class="flex min-h-0 flex-1 flex-col"
      >
        <div class="flex shrink-0 items-center gap-2 border-b px-3">
          <Search class="size-4 shrink-0 opacity-50" />
          <CommandPrimitive.Input
            bind:ref={inputRef}
            bind:value={query}
            placeholder="Search script or language…"
            class="h-9 w-full bg-transparent text-sm outline-hidden placeholder:text-muted-foreground sm:h-10"
          />
        </div>
        <div class="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav
            aria-label="Script sections"
            class="flex shrink-0 gap-0.5 border-b bg-muted/30 p-1 sm:w-28 sm:flex-col sm:border-e sm:border-b-0 sm:p-1.5"
          >
            {#each allGroups as g (g.category)}
              {@const n = countFor(g.category)}
              <button
                type="button"
                disabled={n === 0}
                class={cn(
                  'flex flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition-colors disabled:opacity-40 sm:flex-none sm:justify-between sm:px-2 sm:py-1.5',
                  activeCategory === g.category && n > 0
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                )}
                onclick={() => jumpTo(g.category)}
              >
                {CATEGORY_SHORT[g.category]}
                <span class="text-[0.65rem] tabular-nums opacity-60">{n}</span>
              </button>
            {/each}
          </nav>
          <CommandPrimitive.List
            bind:ref={listRef}
            onscroll={onScroll}
            class="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
          >
            {#if visible.length === 0}
              <p class="px-2 py-6 text-center text-sm text-muted-foreground">No script found</p>
            {/if}
            {#each groups as g (g.category)}
              <CommandPrimitive.Group value={g.category} data-section={g.category}>
                <CommandPrimitive.GroupHeading
                  class="px-2 pt-2 pb-1 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  {CATEGORIES[g.category]}
                </CommandPrimitive.GroupHeading>
                <CommandPrimitive.GroupItems>
                  {#each g.scripts as s (s)}
                    <CommandPrimitive.Item
                      value={s}
                      onSelect={() => choose(s)}
                      class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm outline-hidden select-none data-selected:bg-accent data-selected:text-accent-foreground sm:gap-2.5 sm:py-1.5"
                    >
                      <ScriptGlyph script={s} class="size-6 text-xs sm:size-7 sm:text-sm" />
                      <span class="flex min-w-0 flex-1 flex-col leading-tight">
                        <span class="flex min-w-0 items-center gap-1.5">
                          <span class="truncate">{s}</span>
                          {#if CUSTOM_SCHEMES.has(s)}
                            <span
                              class="shrink-0 rounded border border-border px-1 text-[0.6rem] leading-3.5 font-medium tracking-wide text-muted-foreground uppercase"
                              title="Lipi Lekhika's own scheme">custom</span
                            >
                          {/if}
                        </span>
                        {#if SCRIPT_HINT[s]}
                          <span class="truncate text-xs text-muted-foreground"
                            >{SCRIPT_HINT[s]}</span
                          >
                        {/if}
                      </span>
                      {#if s === script}
                        <Check class="size-4 shrink-0 text-primary" />
                      {/if}
                    </CommandPrimitive.Item>
                  {/each}
                </CommandPrimitive.GroupItems>
              </CommandPrimitive.Group>
            {/each}
            <!-- lets the last section scroll to the top so it can become the active one -->
            <div class="h-[60%]" aria-hidden="true"></div>
          </CommandPrimitive.List>
        </div>
      </CommandPrimitive.Root>
    </Popover.Content>
  </Popover.Root>
{/if}
