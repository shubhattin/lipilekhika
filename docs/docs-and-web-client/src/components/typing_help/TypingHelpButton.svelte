<!--
  Opens the typing guide. A labelled pill instead of a bare "?" icon, which people tended
  to skip: "How to type" on wider screens, "Help" on phones, just the icon on the
  narrowest ones where the row has no room for a label. Until the guide has been
  opened once, a small pulsing dot draws the eye to it.
-->
<script lang="ts">
  import { BookOpen } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { cn } from '~/lib/utils.js';

  let { onclick, class: className = '' }: { onclick: () => void; class?: string } = $props();

  const SEEN_KEY = 'lipilekhika-typing-guide-seen';

  // read after mount: the page is prerendered, where storage isn't available
  let seen = $state(true);
  onMount(() => {
    try {
      seen = localStorage.getItem(SEEN_KEY) === 'true';
    } catch {
      // storage blocked: skip the nudge rather than show it forever
    }
  });

  const open = () => {
    if (!seen) {
      seen = true;
      try {
        localStorage.setItem(SEEN_KEY, 'true');
      } catch {
        // storage unavailable: the dot just comes back next visit
      }
    }
    onclick();
  };
</script>

<button
  type="button"
  onclick={open}
  title="Typing guide: which English keys make which letters"
  class={cn(
    'relative inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 text-xs font-medium text-sky-700 transition-colors outline-none hover:border-sky-500/50 hover:bg-sky-500/15 focus-visible:ring-[3px] focus-visible:ring-sky-500/40 min-[400px]:px-2.5 dark:text-sky-300',
    className
  )}
>
  <BookOpen class="size-3.5" />
  <span class="hidden min-[400px]:inline sm:hidden">Help</span>
  <span class="hidden sm:inline">How to type</span>
  <span class="sr-only min-[400px]:hidden">Typing help</span>
  {#if !seen}
    <span class="absolute -top-0.5 -right-0.5 flex size-2" aria-hidden="true">
      <span class="absolute inline-flex size-full animate-ping rounded-full bg-sky-400 opacity-75"
      ></span>
      <span class="relative inline-flex size-2 rounded-full bg-sky-500"></span>
    </span>
  {/if}
</button>
