<script lang="ts">
  import type { ScriptListType } from 'lipilekhika';
  import HelpShell from './HelpShell.svelte';
  import TypingControls from './TypingControls.svelte';
  import { displayText, isInvisible, type Cell, type HelpContext } from './layout';

  /** Help 2: labelled sections of cards with a section nav, Help 4 is the same in colour */
  let {
    open = $bindable(),
    script,
    colorful = false,
    variant_label = 'Help 2 · Cards'
  }: {
    open: boolean;
    script: ScriptListType;
    /** colour the cards by their group, like the chart of Help 1 */
    colorful?: boolean;
    variant_label?: string;
  } = $props();

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
  const PLAIN: Tone = {
    card: 'bg-card hover:border-foreground/25 hover:bg-accent/40',
    glyph: '',
    bar: ''
  };

  const toneOf = (section: string, group: string): Tone => {
    if (!colorful) return PLAIN;
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
          <span
            class="text-2xl leading-tight {ctx.font} {colorful
              ? tone.glyph + ' opacity-75'
              : 'text-muted-foreground'}"
          >
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

<HelpShell bind:open {script} {variant_label}>
  {#snippet body(ctx)}
    <nav
      class="sticky -top-4 z-10 -mx-4 -mt-4 mb-4 flex gap-1.5 overflow-x-auto border-b bg-background/95 px-4 py-2 backdrop-blur sm:-mx-5 sm:px-5"
    >
      {#each ctx.layout.sections as section (section.id)}
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
      {#each ctx.layout.sections as section (section.id)}
        <section bind:this={section_els[section.id]} class="scroll-mt-14">
          <div class="mb-3 flex items-baseline gap-2">
            <span class="size-2.5 self-center rounded-full {SECTION_ACCENT[section.id]}"></span>
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
                    {#if colorful}
                      <span class="h-3 w-1 self-center rounded-full {tone.bar}"></span>
                    {/if}
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
    {#if ctx.layout.controls}
      <TypingControls controls={ctx.layout.controls} font={ctx.font} />
    {/if}
  {/snippet}
</HelpShell>
