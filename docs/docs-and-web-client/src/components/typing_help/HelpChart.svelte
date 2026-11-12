<script lang="ts">
  import type { ScriptListType } from 'lipilekhika';
  import HelpShell from './HelpShell.svelte';
  import TypingControls from './TypingControls.svelte';
  import { displayText, isInvisible, type Cell, type Group, type HelpContext } from './layout';

  /** Help 1: a dense chart in the style of the old Lipi Lekhika images */
  let { open = $bindable(), script }: { open: boolean; script: ScriptListType } = $props();

  const TONES = {
    svara: 'text-sky-700 dark:text-sky-300',
    vyanjana: 'text-rose-700 dark:text-rose-300',
    numerals: 'text-violet-700 dark:text-violet-300',
    conjuncts: 'text-emerald-700 dark:text-emerald-300',
    other: 'text-amber-700 dark:text-amber-300'
  };
  const VYANJANA_GROUPS = ['antahstha', 'ushma', 'extra', 'nukta'];
  const toneOf = (g: Group) =>
    g.id === 'conjuncts'
      ? TONES.conjuncts
      : g.id === 'numerals'
        ? TONES.numerals
        : g.columns || VYANJANA_GROUPS.includes(g.id)
          ? TONES.vyanjana
          : TONES.other;
</script>

{#snippet glyph(text: string, label: string | undefined, cls: string)}
  {#if isInvisible(text)}
    <span class="text-[10px] leading-tight font-semibold text-muted-foreground">{label ?? '?'}</span
    >
  {:else}
    <span class={cls}>{displayText(text)}</span>
  {/if}
{/snippet}

{#snippet keys(cell: Cell, ctx: HelpContext)}
  <span class="font-mono text-xs leading-tight font-bold">{cell.main.primary}</span>
  {#if ctx.show_alternates && cell.main.alternates.length > 0}
    <span class="font-mono text-[10px] leading-tight break-all text-muted-foreground">
      {cell.main.alternates.join(', ')}
    </span>
  {/if}
{/snippet}

{#snippet chartCell(cell: Cell | null, tone: string, ctx: HelpContext)}
  <div class="flex min-w-0 flex-col items-center px-1 py-1.5 text-center">
    {#if cell}
      {@render glyph(cell.main.text, cell.label, `text-2xl leading-snug ${ctx.font} ${tone}`)}
      {#if ctx.mode === 'typing'}
        {@render keys(cell, ctx)}
      {:else}
        <span class="text-xl leading-snug text-muted-foreground {ctx.other_font}">
          {cell.other?.text ? displayText(cell.other.text) : '—'}
        </span>
      {/if}
    {/if}
  </div>
{/snippet}

{#snippet panelTitle(title: string)}
  <div
    class="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
  >
    {title}
  </div>
{/snippet}

<HelpShell bind:open {script} variant_label="Help 1 · Chart" content_class="sm:max-w-5xl">
  {#snippet body(ctx)}
    {@const groups = ctx.layout.sections.flatMap((s) => s.groups)}
    {@const svara = groups.find((g) => g.id === 'svara')}
    {@const vargas = groups.filter((g) => g.columns === 5)}
    {@const numerals = groups.find((g) => g.id === 'numerals')}
    {@const consonant_groups = ctx.layout.sections
      .filter((s) => s.id === 'vyanjana')
      .flatMap((s) => s.groups)
      .filter((g) => !vargas.includes(g))}
    {@const rest = groups.filter(
      (g) => g !== svara && g !== numerals && !vargas.includes(g) && !consonant_groups.includes(g)
    )}

    <div class="grid gap-3 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_minmax(0,8rem)]">
      {#if svara}
        <div class="overflow-hidden rounded-lg border border-sky-500/25 bg-sky-500/5">
          {@render panelTitle('Svara')}
          <div class="grid sm:grid-cols-2 lg:grid-cols-1">
            {#each svara.cells as cell, i (cell?.id ?? i)}
              {#if cell}
                <div
                  class="grid grid-cols-[2.5rem_2.25rem_minmax(0,1fr)] items-center gap-1 px-3 py-1 even:bg-sky-500/5"
                >
                  <span class="text-2xl leading-snug {ctx.font} {TONES.svara}"
                    >{cell.main.text}</span
                  >
                  <span class="text-2xl leading-snug opacity-80 {ctx.font} {TONES.svara}">
                    {cell.sign ? displayText(cell.sign.text) : ''}
                  </span>
                  {#if ctx.mode === 'typing'}
                    <span class="flex min-w-0 flex-wrap font-mono text-xs leading-tight">
                      <b>{cell.main.primary}</b>
                      {#if ctx.show_alternates && cell.main.alternates.length > 0}
                        <span class="text-muted-foreground"
                          >{', ' + cell.main.alternates.join(', ')}</span
                        >
                      {/if}
                    </span>
                  {:else}
                    <span class="text-xl leading-snug text-muted-foreground {ctx.other_font}">
                      {cell.other?.text}{cell.other?.sign ? ' ' + displayText(cell.other.sign) : ''}
                    </span>
                  {/if}
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/if}

      {#if vargas.length > 0}
        <div class="overflow-hidden rounded-lg border border-rose-500/20 bg-rose-500/5">
          {@render panelTitle('Vyañjana')}
          {#each vargas as varga (varga.id)}
            <div class="grid grid-cols-5 even:bg-rose-500/5" title={varga.title}>
              {#each varga.cells as cell, i (cell?.id ?? i)}
                {@render chartCell(cell, TONES.vyanjana, ctx)}
              {/each}
            </div>
          {/each}
          {#each consonant_groups as group (group.id)}
            <div class="border-t border-rose-500/20">
              <div class="px-3 pt-1.5 text-[10px] font-medium text-muted-foreground">
                {group.title}{group.hint ? ' · ' + group.hint : ''}
              </div>
              <div class="grid grid-cols-5">
                {#each group.cells as cell, i (cell?.id ?? i)}
                  {@render chartCell(cell, toneOf(group), ctx)}
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}

      {#if numerals}
        <div class="overflow-hidden rounded-lg border border-violet-500/25 bg-violet-500/5">
          {@render panelTitle('Numerals')}
          <div class="grid grid-cols-5 lg:grid-cols-1">
            {#each numerals.cells as cell, i (cell?.id ?? i)}
              {#if cell}
                <div
                  class="flex flex-col items-center gap-x-2 px-2 py-1 even:bg-violet-500/5 lg:flex-row lg:justify-between"
                >
                  <span class="text-xl leading-snug {ctx.font} {TONES.numerals}">
                    {cell.main.text}
                  </span>
                  {#if ctx.mode === 'typing'}
                    <span class="flex font-mono text-xs">
                      <b>{cell.main.primary}</b>
                      {#if ctx.show_alternates && cell.main.alternates.length > 0}
                        <span class="text-muted-foreground"
                          >{', ' + cell.main.alternates.join(', ')}</span
                        >
                      {/if}
                    </span>
                  {:else}
                    <span class="text-lg text-muted-foreground {ctx.other_font}">
                      {cell.other?.text}
                    </span>
                  {/if}
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <div class="mt-3 overflow-hidden rounded-lg border">
      {#each rest as group (group.id)}
        <div
          class="flex flex-col gap-x-3 border-b px-3 py-1.5 last:border-b-0 even:bg-muted/40 sm:flex-row sm:items-center"
        >
          <div class="shrink-0 py-1 sm:w-32">
            <div class="text-xs font-semibold">{group.title}</div>
            {#if group.hint}
              <div class="text-[10px] leading-tight text-muted-foreground">{group.hint}</div>
            {/if}
          </div>
          <div class="grid flex-1 grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))]">
            {#each group.cells as cell, i (cell?.id ?? i)}
              {@render chartCell(cell, toneOf(group), ctx)}
            {/each}
          </div>
        </div>
      {/each}
    </div>
    {#if ctx.layout.controls}
      <TypingControls controls={ctx.layout.controls} font={ctx.font} />
    {/if}
  {/snippet}
</HelpShell>
