<script lang="ts">
  import { type ScriptListType, SCRIPT_LIST } from 'lipilekhika';
  import { getScriptKramaData, getScriptTypingDataMap } from 'lipilekhika/typing';

  import * as Dialog from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';
  import * as Tabs from '$lib/components/ui/tabs';
  import { Badge } from '$lib/components/ui/badge';
  import { Skeleton } from '$lib/components/ui/skeleton';

  import { Keyboard, Map as MapIcon, ArrowLeftRight } from 'lucide-svelte';
  import ScriptSeleector from './script/ScriptSelector.svelte';

  let { open = $bindable(), script: script_input } = $props<{
    open: boolean;
    script: ScriptListType;
  }>();

  // svelte-ignore state_referenced_locally
  let script = $state<ScriptListType>(script_input);

  let script_to_compare = $state<ScriptListType | undefined>('Romanized');

  let script_typing_map_promise = $derived(getScriptTypingDataMap(script));

  let base_script_krama_prom = $derived(getScriptKramaData(script));
  let script_to_compare_krama_prom = $derived(
    script_to_compare ? getScriptKramaData(script_to_compare) : null
  );

  type ListType = 'svara' | 'vyanjana' | 'anya' | 'mAtrA';
  type Item = [text: string, type: ListType, mappings: string[]];
  type KramaRow = [text: string, type: ListType];

  const isSvara = (t: ListType) => t === 'svara' || t === 'mAtrA';

  const filterCategory = (items: Item[], category: 'svara' | 'vyanjana' | 'anya') => {
    if (category === 'svara') return items.filter(([, t]) => isSvara(t));
    if (category === 'vyanjana') return items.filter(([, t]) => t === 'vyanjana');
    return items.filter(([, t]) => t === 'anya');
  };
</script>

<Dialog.Root bind:open>
  <Dialog.Content
    class="w-[95vw] max-w-4xl p-0 sm:w-full sm:max-w-3xl"
    aria-describedby="typing-helper-description"
  >
    <div class="flex max-h-[85vh] flex-col">
      <div class="flex items-start justify-between gap-4 p-5 sm:p-6">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <Keyboard class="size-5 text-primary" />
            <Dialog.Title class="truncate text-base font-semibold sm:text-lg">
              Typing help
            </Dialog.Title>
          </div>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        <div class="mb-4 flex items-center justify-center gap-x-2">
          <span class="text-sm text-muted-foreground">Select Script</span>
          <ScriptSeleector bind:script />
        </div>

        <Tabs.Root value="typing-map" class="flex h-full min-h-0 flex-col">
          <Tabs.List class="grid w-full grid-cols-2">
            <Tabs.Trigger value="typing-map" class="gap-2">
              <MapIcon class="size-4" />
              Typing Map
            </Tabs.Trigger>
            <Tabs.Trigger value="compare-scripts" class="gap-2">
              <ArrowLeftRight class="size-4" />
              Compare Scripts
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="typing-map" class="mt-4 flex-1 pr-1">
            {#await script_typing_map_promise}
              <section class="space-y-6" aria-label="Loading typing map">
                {#each ['Svara', 'Vyanjana', 'Other', 'Script-specific Characters'] as title (title)}
                  <div>
                    <div class="mb-2 flex items-center justify-between gap-2">
                      <Skeleton class="h-6 w-40" />
                    </div>
                    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {#each Array.from({ length: 12 }) as _, idx (title + idx)}
                        <div class="rounded-md border border-border bg-card p-2">
                          <Skeleton class="h-6 w-14" />
                          <div class="mt-2 flex flex-wrap gap-1">
                            <Skeleton class="h-4 w-10 opacity-70" />
                            <Skeleton class="h-4 w-12 opacity-60" />
                            <Skeleton class="h-4 w-14 opacity-50" />
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/each}
              </section>
            {:then script_typing_map}
              {@const common = script_typing_map.common_krama_map as Item[]}
              {@const specific = script_typing_map.script_specific_krama_map as Item[]}
              {@const svaraItems = filterCategory(common, 'svara')}
              {@const vyanjanaItems = filterCategory(common, 'vyanjana')}
              {@const otherItems = filterCategory(common, 'anya')}

              <section class="space-y-6">
                <!-- Svara -->
                <div>
                  <div class="mb-2 flex items-center justify-between gap-2">
                    <h3 class="text-lg font-semibold tracking-wide">Svara</h3>
                  </div>
                  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {#each svaraItems as [char, type, mappings] (char + type)}
                      <div
                        class="rounded-md border border-border bg-card p-2 transition-all focus-within:ring-2 focus-within:ring-ring/50 focus-within:ring-offset-2 focus-within:ring-offset-background hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-accent/30 hover:shadow-md"
                      >
                        <div class="flex items-start justify-between gap-2">
                          <div class="text-xl leading-none font-semibold">{char}</div>
                        </div>
                        <div
                          class="mt-1 flex max-h-20 flex-wrap items-start gap-1 overflow-auto pr-1"
                          aria-label="Typing mappings"
                        >
                          {#each mappings as m (m)}
                            <Badge variant="outline" class="px-1.5 py-0 text-[10px]">
                              <code class="font-mono text-[10px]">{m}</code>
                            </Badge>
                          {/each}
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>

                <!-- Vyanjana -->
                <div>
                  <div class="mb-2 flex items-center justify-between gap-2">
                    <h3 class="text-lg font-semibold tracking-wide">Vyanjana</h3>
                  </div>
                  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {#each vyanjanaItems as [char, type, mappings] (char + type)}
                      <div
                        class="rounded-md border border-border bg-card p-2 transition-all focus-within:ring-2 focus-within:ring-ring/50 focus-within:ring-offset-2 focus-within:ring-offset-background hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-accent/30 hover:shadow-md"
                      >
                        <div class="flex items-start justify-between gap-2">
                          <div class="text-xl leading-none font-semibold">{char}</div>
                        </div>
                        <div class="mt-1 flex max-h-20 flex-wrap gap-1 overflow-auto pr-1">
                          {#each mappings as m (m)}
                            <Badge variant="outline" class="px-1.5 py-0 text-[10px]">
                              <code class="font-mono text-[10px]">{m}</code>
                            </Badge>
                          {/each}
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>

                <!-- Other -->
                <div>
                  <div class="mb-2 flex items-center justify-between gap-2">
                    <h3 class="text-lg font-semibold tracking-wide">Other</h3>
                  </div>
                  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {#each otherItems as [char, type, mappings] (char + type)}
                      <div
                        class="rounded-md border border-border bg-card p-2 transition-all focus-within:ring-2 focus-within:ring-ring/50 focus-within:ring-offset-2 focus-within:ring-offset-background hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-accent/30 hover:shadow-md"
                      >
                        <div class="flex items-start justify-between gap-2">
                          <div class="text-xl leading-none font-semibold">{char}</div>
                        </div>
                        <div class="mt-1 flex max-h-20 flex-wrap gap-1 overflow-auto pr-1">
                          {#each mappings as m (m)}
                            <Badge variant="outline" class="px-1.5 py-0 text-[10px]">
                              <code class="font-mono text-[10px]">{m}</code>
                            </Badge>
                          {/each}
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>

                <!-- Script-specific preview -->
                <div>
                  <div class="mb-2 flex items-center justify-between gap-2">
                    <h3 class="text-lg font-semibold tracking-wide">Script-specific Characters</h3>
                  </div>
                  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {#each specific as [char, type, mappings] (char + type)}
                      <div
                        class="rounded-md border border-border bg-card p-2 transition-all focus-within:ring-2 focus-within:ring-ring/50 focus-within:ring-offset-2 focus-within:ring-offset-background hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-accent/30 hover:shadow-md"
                      >
                        <div class="flex items-start justify-between gap-2">
                          {#if char !== '\u200d'}
                            <div class="text-xl leading-none font-semibold">{char}</div>
                          {:else}
                            <div class="text-xs leading-none font-semibold">zero width joiner</div>
                          {/if}
                        </div>
                        <div class="mt-1 flex max-h-20 flex-wrap gap-1 overflow-auto pr-1">
                          {#if mappings.length === 0}
                            <span class="text-xs text-muted-foreground">No mappings</span>
                          {:else}
                            {#each mappings as m (m)}
                              <Badge variant="outline" class="px-1.5 py-0 text-[10px]">
                                <code class="font-mono text-[10px]">{m}</code>
                              </Badge>
                            {/each}
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              </section>
            {:catch err}
              <div class="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <p class="font-medium text-destructive">Could not load typing map</p>
                <p class="mt-1 text-xs text-muted-foreground">{String(err)}</p>
              </div>
            {/await}
          </Tabs.Content>

          <Tabs.Content value="compare-scripts" class="mt-4 flex-1 pr-1">
            <div class="space-y-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="text-sm text-muted-foreground">
                  Current script: <span class="font-medium text-foreground">{script}</span>
                </div>

                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <span class="text-sm text-muted-foreground">Compare with</span>
                  <Select.Root type="single" bind:value={script_to_compare}>
                    <Select.Trigger
                      class={`w-full sm:w-64 ${!script_to_compare ? 'text-muted-foreground' : ''}`}
                    >
                      {script_to_compare ?? 'Select a script'}
                    </Select.Trigger>
                    <Select.Content>
                      {#each (SCRIPT_LIST as ScriptListType[]).filter((s) => s !== script && s !== 'Normal') as s (s)}
                        <Select.Item value={s} label={s} />
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </div>
              </div>

              {#if !script_to_compare}
                <div
                  class="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground"
                >
                  Select a script to compare against <span class="font-medium">{script}</span>.
                </div>
              {:else}
                {@const compareProm = script_to_compare_krama_prom as Promise<KramaRow[]>}
                {#await Promise.all([base_script_krama_prom as Promise<KramaRow[]>, compareProm])}
                  <!-- Skeleton: only shown while a compare script is selected and data is loading -->
                  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {#each Array.from({ length: 12 }) as _, idx (idx)}
                      <div class="rounded-md border border-border bg-card p-2">
                        <Skeleton class="h-6 w-14" />
                        <div class="mt-2"></div>
                        <Skeleton class="h-6 w-14 opacity-70" />
                      </div>
                    {/each}
                  </div>
                {:then [base, compare]}
                  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {#each base as [baseText], i (baseText + i)}
                      {#if baseText.length !== 0}
                        <div
                          class="rounded-md border border-border bg-card p-2 transition-all focus-within:ring-2 focus-within:ring-ring/50 focus-within:ring-offset-2 focus-within:ring-offset-background hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-accent/30 hover:shadow-md"
                        >
                          <div class="text-xl leading-none font-semibold">{baseText}</div>
                          <div
                            class="mt-1 text-xl leading-none font-semibold text-muted-foreground"
                          >
                            {compare[i]?.[0] ?? '—'}
                          </div>
                        </div>
                      {/if}
                    {/each}
                  </div>
                {:catch err}
                  <div class="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                    <p class="font-medium text-destructive">Could not load script comparison</p>
                    <p class="mt-1 text-xs text-muted-foreground">{String(err)}</p>
                  </div>
                {/await}
              {/if}
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
