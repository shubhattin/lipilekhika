<script lang="ts">
  import type { ScriptListType } from 'lipilekhika';
  import { getScriptAvatar } from '$components/script/script_avatar';
  import { getFontClass } from '$components/script/font_list';
  import { cn } from '~/lib/utils.js';

  let { script, class: className = '' }: { script: ScriptListType; class?: string } = $props();
</script>

<span
  aria-hidden="true"
  class={cn(
    'inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm leading-none text-foreground',
    getFontClass(script),
    className
  )}>{getScriptAvatar(script)}</span
>
