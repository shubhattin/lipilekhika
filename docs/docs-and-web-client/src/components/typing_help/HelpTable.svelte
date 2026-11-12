<script lang="ts">
  import type { ScriptListType } from 'lipilekhika';
  import HelpShell from './HelpShell.svelte';
  import TypingControls from './TypingControls.svelte';
  import {
    VARGA_COLUMNS,
    cellMatches,
    displayText,
    isInvisible,
    type Cell,
    type HelpContext
  } from './layout';

  /** Help 3: the vargas as a phonetic table, the rest as key lists, with a search */
  let { open = $bindable(), script }: { open: boolean; script: ScriptListType } = $props();

  const VARGA_SHORT = ['Unv.', 'Asp.', 'Voi.', 'V. asp.', 'Nasal'];

  const matchClass = (cell: Cell, ctx: HelpContext) =>
    !ctx.query.trim()
      ? ''
      : cellMatches(cell, ctx.query)
        ? 'bg-primary/10 ring-1 ring-primary/50'
        : 'opacity-25';
</script>

{#snippet glyph(text: string, label: string | undefined, cls: string)}
  {#if isInvisible(text)}
    <span class="text-xs font-semibold text-muted-foreground">{label ?? '?'}</span>
  {:else}
    <span class={cls}>{displayText(text)}</span>
  {/if}
{/snippet}

{#snippet keyList(cell: Cell, ctx: HelpContext)}
  {#if ctx.mode === 'typing'}
    <span class="font-mono text-xs">
      <b class="text-foreground">{cell.main.primary}</b>
      {#if ctx.show_alternates && cell.main.alternates.length > 0}
        <span class="text-muted-foreground"> · {cell.main.alternates.join(' · ')}</span>
      {/if}
    </span>
  {:else}
    <span class="text-lg leading-tight text-muted-foreground {ctx.other_font}">
      {cell.other?.text ? displayText(cell.other.text) : '—'}{cell.other?.sign
        ? '  ' + displayText(cell.other.sign)
        : ''}
    </span>
  {/if}
{/snippet}

{#snippet row(cell: Cell, ctx: HelpContext, wide: boolean)}
  <div
    class="grid {wide
      ? 'grid-cols-[4.5rem_minmax(0,1fr)]'
      : 'grid-cols-[2.75rem_minmax(0,1fr)] sm:grid-cols-[3.5rem_minmax(0,1fr)]'} items-center gap-1.5 rounded-md px-2 py-1 transition-opacity sm:gap-2 {matchClass(
      cell,
      ctx
    )}"
    title={cell.label}
  >
    <span class="flex items-baseline gap-1.5">
      {@render glyph(cell.main.text, cell.label, `text-xl leading-tight ${ctx.font}`)}
      {#if cell.sign}
        <span class="text-xl leading-tight text-muted-foreground {ctx.font}">
          {displayText(cell.sign.text)}
        </span>
      {/if}
    </span>
    {@render keyList(cell, ctx)}
  </div>
{/snippet}

{#snippet heading(title: string, hint?: string)}
  <div class="mb-1.5 flex items-baseline gap-2 border-b pb-1">
    <h4 class="text-sm font-semibold">{title}</h4>
    {#if hint}<span class="text-xs text-muted-foreground">{hint}</span>{/if}
  </div>
{/snippet}

<HelpShell
  bind:open
  {script}
  variant_label="Help 3 · Table"
  content_class="sm:max-w-4xl"
  searchable
>
  {#snippet body(ctx)}
    {@const groups = ctx.layout.sections.flatMap((s) => s.groups)}
    {@const vargas = groups.filter((g) => g.columns === 5)}
    {@const non_varga = ctx.layout.sections.map((s) => ({
      ...s,
      groups: s.groups.filter((g) => g.columns !== 5)
    }))}

    <div class="space-y-6">
      {#each non_varga as section (section.id)}
        <section>
          <h3 class="mb-2 text-lg font-semibold">
            {section.title}
            {#if section.hint}
              <span class="text-sm font-normal text-muted-foreground">· {section.hint}</span>
            {/if}
          </h3>

          {#if section.id === 'vyanjana' && vargas.length > 0}
            <div class="mb-5 overflow-hidden rounded-lg border">
              <table class="w-full table-fixed border-collapse text-center">
                <thead>
                  <tr class="bg-muted/50 text-[11px] text-muted-foreground">
                    <th class="w-12 px-1.5 py-1.5 text-left font-medium sm:w-28 sm:px-3"></th>
                    {#each VARGA_COLUMNS as col, i (col)}
                      <th class="px-0.5 py-1.5 leading-tight font-medium">
                        <span class="hidden sm:inline">{col}</span>
                        <span class="sm:hidden">{VARGA_SHORT[i]}</span>
                      </th>
                    {/each}
                  </tr>
                </thead>
                <tbody>
                  {#each vargas as varga (varga.id)}
                    <tr class="border-t">
                      <th class="px-1.5 py-1 text-left align-middle sm:px-3">
                        <div class="text-xs font-semibold">
                          {varga.title.replace('-varga', '')}<span class="hidden sm:inline"
                            >-varga</span
                          >
                        </div>
                        <div class="hidden text-[10px] font-normal text-muted-foreground sm:block">
                          {varga.hint}
                        </div>
                      </th>
                      {#each varga.cells as cell, i (cell?.id ?? i)}
                        <td class="border-l p-0.5 align-top sm:p-1">
                          {#if cell}
                            <div
                              class="flex flex-col items-center rounded-md py-1 transition-opacity {matchClass(
                                cell,
                                ctx
                              )}"
                            >
                              <span class="text-2xl leading-snug {ctx.font}">{cell.main.text}</span>
                              {#if ctx.mode === 'typing'}
                                <span class="font-mono text-xs font-bold">{cell.main.primary}</span>
                                {#if ctx.show_alternates && cell.main.alternates.length > 0}
                                  <span class="font-mono text-[10px] text-muted-foreground">
                                    {cell.main.alternates.join(' · ')}
                                  </span>
                                {/if}
                              {:else}
                                <span class="text-xl text-muted-foreground {ctx.other_font}">
                                  {cell.other?.text || '—'}
                                </span>
                              {/if}
                            </div>
                          {/if}
                        </td>
                      {/each}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}

          <div class="grid gap-x-6 gap-y-4 md:grid-cols-2">
            {#each section.groups as group (group.id)}
              <div class={group.id === 'svara' ? 'md:col-span-2' : ''}>
                {#if group.title !== section.title}
                  {@render heading(group.title, group.hint)}
                {/if}
                <div
                  class={group.id === 'svara'
                    ? 'grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3'
                    : 'grid grid-cols-2 gap-x-3 sm:gap-x-4'}
                >
                  {#each group.cells as cell, i (cell?.id ?? i)}
                    {#if cell}
                      {@render row(cell, ctx, group.id === 'svara')}
                    {/if}
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
