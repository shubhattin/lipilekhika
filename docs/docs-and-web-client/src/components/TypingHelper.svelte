<script lang="ts">
  import type { ScriptListType } from 'lipilekhika';
  import * as Dialog from '~/lib/components/ui/dialog';
  import * as Tabs from '~/lib/components/ui/tabs';
  import * as Popover from '~/lib/components/ui/popover';
  import { Skeleton } from '~/lib/components/ui/skeleton';
  import { Checkbox } from '~/lib/components/ui/checkbox';
  import { Label } from '~/lib/components/ui/label';
  import { Keyboard, Map as MapIcon, ArrowLeftRight, Info } from 'lucide-svelte';
  import ScriptSelector from './script/ScriptSelector.svelte';
  import { getFontClass } from './script/font_list';
  import TypingControls from './typing_help/TypingControls.svelte';
  import {
    buildLayout,
    displayText,
    isInvisible,
    type Cell,
    type HelpContext
  } from './typing_help/layout';

  let { open = $bindable(), script: script_input }: { open: boolean; script: ScriptListType } =
    $props();

  // svelte-ignore state_referenced_locally
  let script = $state<ScriptListType>(script_input === 'Normal' ? 'Devanagari' : script_input);
  let compare = $state<ScriptListType>('Romanized');
  let tab = $state<'typing' | 'compare'>('typing');
  let show_alternates = $state(true);

  let layout_prom = $derived(tab === 'typing' ? buildLayout(script) : buildLayout(script, compare));

  /** ई with its keys (I, ee, ii) in the selected script, the example of the alternate keys info */
  let alternates_example = $state<{ text: string; keys: string[] } | null>(null);
  $effect(() => {
    const for_script = script;
    buildLayout(for_script)
      .then((layout) => {
        // a slower load of a script picked before
        if (for_script !== script) return;
        const cell = layout.sections[0]?.groups[0]?.cells.find((c) => c?.id === 'I');
        if (cell?.main.primary) {
          alternates_example = {
            text: cell.main.text,
            keys: [cell.main.primary, ...cell.main.alternates.filter((k) => !k.startsWith('.'))]
          };
        } else alternates_example = null;
      })
      .catch(() => (alternates_example = null));
  });

  type Tone = { card: string; glyph: string; bar: string };
  // full class names, so that tailwind finds them
  const TONES = {
    sky: {
      card: 'border-sky-500/25 bg-sky-500/5 hover:border-sky-500/50 hover:bg-sky-500/10',
      glyph: 'text-sky-700 dark:text-sky-300',
      bar: 'bg-sky-500'
    },
    rose: {
      card: 'border-rose-500/25 bg-rose-500/5 hover:border-rose-500/50 hover:bg-rose-500/10',
      glyph: 'text-rose-700 dark:text-rose-300',
      bar: 'bg-rose-500'
    },
    emerald: {
      card: 'border-emerald-500/25 bg-emerald-500/5 hover:border-emerald-500/50 hover:bg-emerald-500/10',
      glyph: 'text-emerald-700 dark:text-emerald-300',
      bar: 'bg-emerald-500'
    },
    violet: {
      card: 'border-violet-500/25 bg-violet-500/5 hover:border-violet-500/50 hover:bg-violet-500/10',
      glyph: 'text-violet-700 dark:text-violet-300',
      bar: 'bg-violet-500'
    },
    amber: {
      card: 'border-amber-500/25 bg-amber-500/5 hover:border-amber-500/50 hover:bg-amber-500/10',
      glyph: 'text-amber-700 dark:text-amber-300',
      bar: 'bg-amber-500'
    },
    fuchsia: {
      card: 'border-fuchsia-500/25 bg-fuchsia-500/5 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10',
      glyph: 'text-fuchsia-700 dark:text-fuchsia-300',
      bar: 'bg-fuchsia-500'
    }
  } satisfies Record<string, Tone>;

  /** each group is coloured by what it holds, like the charts of the old Lipi Lekhika */
  const toneOf = (section: string, group: string): Tone => {
    if (section === 'svara') return TONES.sky;
    if (section === 'vyanjana') return group === 'conjuncts' ? TONES.emerald : TONES.rose;
    if (section === 'other') return group === 'numerals' ? TONES.violet : TONES.amber;
    return group === 'signs' ? TONES.sky : TONES.fuchsia;
  };

  const SECTION_ACCENT: Record<string, string> = {
    svara: 'bg-sky-500',
    vyanjana: 'bg-rose-500',
    other: 'bg-amber-500',
    special: 'bg-fuchsia-500'
  };

  let section_els = $state<Record<string, HTMLElement | undefined>>({});
  const jumpTo = (id: string) =>
    section_els[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
</script>

{#snippet glyph(text: string, label: string | undefined, cls: string)}
  {#if isInvisible(text)}
    <span class="text-xs font-semibold text-muted-foreground">{label ?? '?'}</span>
  {:else}
    <span class={cls}>{displayText(text)}</span>
  {/if}
{/snippet}

{#snippet card(cell: Cell | null, ctx: HelpContext, tone: Tone)}
  {#if !cell}
    <div class="rounded-lg border border-dashed border-border/60" aria-hidden="true"></div>
  {:else}
    <div
      class="flex min-w-0 flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-center transition-colors {tone.card}"
      title={cell.label}
    >
      <div class="flex items-baseline gap-2">
        {@render glyph(
          cell.main.text,
          cell.label,
          `text-2xl leading-tight ${ctx.font} ${tone.glyph}`
        )}
        {#if cell.sign}
          <span class="text-2xl leading-tight opacity-75 {ctx.font} {tone.glyph}">
            {displayText(cell.sign.text)}
          </span>
        {/if}
      </div>
      {#if ctx.mode === 'typing'}
        <kbd
          class="rounded border border-b-2 bg-muted px-1.5 py-px font-mono text-xs font-semibold text-foreground"
        >
          {cell.main.primary}
        </kbd>
        {#if ctx.show_alternates && cell.main.alternates.length > 0}
          <div class="flex flex-wrap justify-center gap-0.5">
            {#each cell.main.alternates as alt (alt)}
              <span
                class="rounded border border-border/70 px-1 font-mono text-[10px] leading-4 text-muted-foreground"
              >
                {alt}
              </span>
            {/each}
          </div>
        {/if}
      {:else}
        <div class="h-px w-6 bg-border"></div>
        <div class="flex items-baseline gap-2 text-muted-foreground">
          <span class="text-xl leading-tight {ctx.other_font}">
            {cell.other?.text ? displayText(cell.other.text) : '—'}
          </span>
          {#if cell.other?.sign}
            <span class="text-xl leading-tight {ctx.other_font}">
              {displayText(cell.other.sign)}
            </span>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
{/snippet}

<Dialog.Root bind:open>
  <Dialog.Content
    class="flex h-[92dvh] max-h-[92dvh] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[88vh] sm:w-[calc(100vw-2rem)] sm:max-w-4xl"
    onOpenAutoFocus={(e) => e.preventDefault()}
  >
    <div class="flex items-center gap-2 border-b px-4 py-3 pr-12 sm:px-5">
      <Keyboard class="size-5 shrink-0 text-primary" />
      <Dialog.Title class="text-base font-semibold sm:text-lg">Typing help</Dialog.Title>
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
          <div class="ml-auto flex items-center gap-1">
            <Checkbox id="show-alternate-keys" bind:checked={show_alternates} />
            <Label
              for="show-alternate-keys"
              class="cursor-pointer pl-1 text-sm font-normal text-muted-foreground select-none hover:text-foreground"
            >
              <span class="sm:hidden">Alternates</span>
              <span class="hidden sm:inline">Show alternate keys</span>
            </Label>
            <Popover.Root>
              <Popover.Trigger
                class="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="About alternate keys"
              >
                <Info class="size-4" />
              </Popover.Trigger>
              <Popover.Content align="end" class="w-72 space-y-2.5 text-sm">
                <p class="font-semibold">Alternate keys</p>
                <p class="text-muted-foreground">
                  Other keys for the same letter. The first one is the main key.
                </p>
                {#if alternates_example}
                  <div class="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2">
                    {#each alternates_example.keys as key, i (key)}
                      {#if i === 1}<span class="text-xs text-muted-foreground">or</span>{/if}
                      <code
                        class={i === 0
                          ? 'rounded border border-b-2 bg-background px-1.5 font-semibold'
                          : 'rounded border px-1 text-muted-foreground'}>{key}</code
                      >
                    {/each}
                    <span class="text-muted-foreground">→</span>
                    <span class="text-2xl leading-none {getFontClass(script)}"
                      >{alternates_example.text}</span
                    >
                  </div>
                {/if}
                <p class="text-xs text-muted-foreground">
                  All of them work while typing. When converting text, some alternates need the
                  <span class="font-medium text-foreground">Use Typing Characters</span> option.
                </p>
              </Popover.Content>
            </Popover.Root>
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
          {@const ctx = {
            layout,
            mode: tab,
            show_alternates,
            font: getFontClass(script),
            other_font: getFontClass(compare)
          }}
          <nav
            class="sticky -top-4 z-10 -mx-4 -mt-4 mb-4 flex gap-1.5 overflow-x-auto border-b bg-background/95 px-4 py-2 backdrop-blur sm:-mx-5 sm:px-5"
          >
            {#each layout.sections as section (section.id)}
              <button
                type="button"
                onclick={() => jumpTo(section.id)}
                class="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium hover:bg-accent"
              >
                <span class="size-2 rounded-full {SECTION_ACCENT[section.id]}"></span>
                {section.title}
              </button>
            {/each}
          </nav>

          <div class="space-y-8">
            {#each layout.sections as section (section.id)}
              <section bind:this={section_els[section.id]} class="scroll-mt-14">
                <div class="mb-3 flex items-baseline gap-2">
                  <span class="size-2.5 self-center rounded-full {SECTION_ACCENT[section.id]}"
                  ></span>
                  <h3 class="text-lg font-semibold">{section.title}</h3>
                  {#if section.hint}
                    <span class="text-sm text-muted-foreground">{section.hint}</span>
                  {/if}
                </div>
                <div class="space-y-4">
                  {#each section.groups as group (group.id)}
                    {@const tone = toneOf(section.id, group.id)}
                    <div>
                      {#if group.title !== section.title}
                        <div class="mb-1.5 flex items-baseline gap-2">
                          <span class="h-3 w-1 self-center rounded-full {tone.bar}"></span>
                          <h4 class="text-sm font-semibold">{group.title}</h4>
                          {#if group.hint}
                            <span class="text-xs text-muted-foreground">{group.hint}</span>
                          {/if}
                        </div>
                      {/if}
                      <div
                        class={group.columns
                          ? 'grid max-w-xl grid-cols-5 gap-1.5 sm:gap-2'
                          : group.id === 'svara'
                            ? 'grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-1.5 sm:gap-2'
                            : 'grid grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] gap-1.5 sm:gap-2'}
                      >
                        {#each group.cells as cell, i (cell?.id ?? i)}
                          {@render card(cell, ctx, tone)}
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>
              </section>
            {/each}
          </div>
          {#if layout.controls}
            <TypingControls controls={layout.controls} font={ctx.font} />
          {/if}
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
