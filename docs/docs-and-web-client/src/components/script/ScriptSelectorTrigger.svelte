<script lang="ts">
  import type { ScriptListType } from 'lipilekhika';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { ChevronDown } from 'lucide-svelte';
  import ScriptGlyph from './ScriptGlyph.svelte';
  import { cn } from '~/lib/utils.js';

  let {
    script,
    open = false,
    class: className = '',
    ...rest
  }: { script: ScriptListType; open?: boolean } & HTMLButtonAttributes = $props();
</script>

<button
  type="button"
  aria-haspopup="listbox"
  aria-expanded={open}
  class={cn(
    'flex h-9 w-48 items-center gap-2 rounded-md border border-border/50 bg-background/50 py-1 ps-1 pe-2 text-sm shadow-xs transition-colors outline-none hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50',
    className
  )}
  {...rest}
>
  <ScriptGlyph {script} />
  <span class="min-w-0 flex-1 truncate text-left">{script}</span>
  <ChevronDown
    class={cn('size-4 shrink-0 opacity-50 transition-transform', open && 'rotate-180')}
  />
</button>
