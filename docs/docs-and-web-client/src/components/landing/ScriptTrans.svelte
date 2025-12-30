<script lang="ts">
  import { FaSolidArrowRight } from 'svelte-icons-pack/fa';
  import { Icon } from 'svelte-icons-pack';
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  const BASE_TEXT = 'नमो नमः';
  const OTHERS = ['నమో నమః', 'নমো নমঃ', 'નમો નમઃ', 'ନମୋ ନମଃ', 'നമോ നമഃ', 'ನಮೋ ನಮಃ'];
  const CHANGE_INTERVAL = 3500;
  const TRANSITION_DURATION = 300;

  let currentIndex = 0;
  let reduceMotion = false;

  onMount(() => {
    reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const id = setInterval(() => {
      currentIndex = (currentIndex + 1) % OTHERS.length;
    }, CHANGE_INTERVAL);
    return () => clearInterval(id);
  });
</script>

<div class="w-full">
  <div
    class="mx-auto inline-flex max-w-full items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-2 text-base shadow-sm shadow-black/5 backdrop-blur-sm sm:px-5 sm:py-3 sm:text-lg"
  >
    <span class="font-medium tracking-tight text-foreground/90">{BASE_TEXT}</span>

    <span class="text-muted-foreground">
      <Icon src={FaSolidArrowRight} />
    </span>

    <span
      class="relative inline-block h-[2.25em] w-24 overflow-hidden font-semibold tracking-tight text-foreground"
      aria-live="polite"
    >
      {#key currentIndex}
        <span
          in:fly={{
            y: reduceMotion ? 0 : 24,
            duration: reduceMotion ? 0 : TRANSITION_DURATION,
            easing: cubicOut
          }}
          out:fly={{
            y: reduceMotion ? 0 : -24,
            duration: reduceMotion ? 0 : TRANSITION_DURATION,
            easing: cubicOut
          }}
          class="absolute inset-0 flex items-center"
        >
          {OTHERS[currentIndex]}
        </span>
      {/key}
    </span>
  </div>
</div>
