<script lang="ts">
  import type { ScriptListType } from 'lipilekhika';
  import HelpShell from './HelpShell.svelte';
  import TypingControls from './TypingControls.svelte';
  import { displayText, isInvisible, type Cell, type HelpContext } from './layout';

  /** Help 2: labelled sections of cards with a section nav */
  let { open = $bindable(), script }: { open: boolean; script: ScriptListType } = $props();

  const SECTION_ACCENT: Record<string, string> = {
    svara: 'bg-sky-500',
    vyanjana: 'bg-rose-500',
    other: 'bg-amber-500',
    special: 'bg-violet-500'
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

{#snippet card(cell: Cell | null, ctx: HelpContext)}
  {#if !cell}
    <div class="rounded-lg border border-dashed border-border/60" aria-hidden="true"></div>
  {:else}
    <div
      class="flex min-w-0 flex-col items-center gap-1 rounded-lg border bg-card px-1.5 py-2 text-center transition-colors hover:border-foreground/25 hover:bg-accent/40"
      title={cell.label}
    >
      <div class="flex items-baseline gap-2">
        {@render glyph(cell.main.text, cell.label, `text-2xl leading-tight ${ctx.font}`)}
        {#if cell.sign}
          <span class="text-2xl leading-tight text-muted-foreground {ctx.font}">
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

<HelpShell bind:open {script} variant_label="Help 2 · Cards">
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
              <div>
                {#if group.title !== section.title}
                  <div class="mb-1.5 flex items-baseline gap-2">
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
                    {@render card(cell, ctx)}
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
