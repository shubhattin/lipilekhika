<script lang="ts">
  import { Button } from '~/lib/components/ui/button';
  import ThemeToggle from './ThemeToggle.svelte';
  import { BsGithub } from 'svelte-icons-pack/bs';
  import { SiNpm } from 'svelte-icons-pack/si';
  import { Icon } from 'svelte-icons-pack';
  import { cn } from '~/lib/utils.js';

  /** follow the wider app page (`max-w-page`) instead of the usual width */
  let { wide = false }: { wide?: boolean } = $props();
</script>

<!--
  The header is narrower on text pages than on the app (`wide`), so its contents sit in a
  different place on each. The view transition names make the logo and the links slide to
  their new spot on navigation instead of jumping, and keep the bar itself steady while the
  page underneath changes.
-->
<header
  class="fixed top-0 right-0 left-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md"
  style:view-transition-name="site-header"
>
  <div
    class={cn(
      'mx-auto flex h-14 items-center justify-between px-4 sm:px-6',
      wide ? 'max-w-page' : 'max-w-6xl'
    )}
  >
    <a
      href="/"
      class="flex items-center gap-2.5 transition-opacity hover:opacity-80"
      style:view-transition-name="site-header-logo"
    >
      <span
        class="inline-block size-8 bg-contain bg-center bg-no-repeat"
        style="background-image: url('/favicon.svg');"
        aria-label="Lipi Lekhika"
        role="img"
      ></span>
      <span class="text-lg font-semibold tracking-tight">Lipi Lekhika</span>
    </a>

    <div class="flex items-center gap-1" style:view-transition-name="site-header-links">
      <Button
        variant="ghost"
        size="icon"
        href="https://www.npmjs.com/package/lipilekhika"
        target="_blank"
        rel="noopener noreferrer"
        class="hidden text-foreground/80 hover:text-foreground sm:flex"
      >
        <Icon src={SiNpm} className="size-4 sm:size-5" />
        <span class="sr-only">NPM</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        href="https://github.com/shubhattin/lipilekhika"
        target="_blank"
        rel="noopener noreferrer"
        class="text-foreground/80 hover:text-foreground"
      >
        <Icon src={BsGithub} className="size-4 sm:size-5" />
        <span class="sr-only">GitHub</span>
      </Button>
      <ThemeToggle />
    </div>
  </div>
</header>
