<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import ThemeToggle from './ThemeToggle.svelte';
  import { BsGithub } from 'svelte-icons-pack/bs';
  import { SiNpm } from 'svelte-icons-pack/si';
  import { Icon } from 'svelte-icons-pack';
</script>

<header
  class="fixed top-0 right-0 left-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md"
>
  <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
    <a href="/" class="flex items-center gap-2.5 transition-opacity hover:opacity-80">
      <img src="/main.png" alt="Lipi Lekhika Logo" class="size-8" />
      <span class="text-lg font-semibold tracking-tight">Lipi Lekhika</span>
    </a>

    <div class="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        href="https://www.npmjs.com/package/lipilekhika"
        target="_blank"
        rel="noopener noreferrer"
        class="text-foreground/80 hover:text-foreground"
      >
        <Icon src={SiNpm} className="size-5" />
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
        <Icon src={BsGithub} className="size-5" />
        <span class="sr-only">GitHub</span>
      </Button>
      <ThemeToggle />
    </div>
  </div>
</header>
