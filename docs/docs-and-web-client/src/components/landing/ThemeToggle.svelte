<script lang="ts">
  import * as Popover from '~/lib/components/ui/popover';
  import { Button } from '~/lib/components/ui/button';
  import Sun from 'lucide-svelte/icons/sun';
  import Moon from 'lucide-svelte/icons/moon';
  import Monitor from 'lucide-svelte/icons/monitor';
  import Check from 'lucide-svelte/icons/check';

  const STORAGE_KEY = 'lipilekhika-theme';

  type Theme = 'light' | 'dark' | 'system';

  let currentTheme = $state<Theme>('system');
  let open = $state(false);

  const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ];

  function getSystemTheme(): 'light' | 'dark' {
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
  }

  function applyTheme(theme: Theme) {
    const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
    document.body.classList.toggle('dark', effectiveTheme === 'dark');
  }

  function setTheme(theme: Theme) {
    currentTheme = theme;
    if (theme === 'system') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, theme);
    }
    applyTheme(theme);
    open = false;
  }

  $effect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      currentTheme = stored;
      applyTheme(currentTheme);
    } else {
      currentTheme = 'system';
      applyTheme(currentTheme);
    }
  });
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="icon"
        class="text-foreground/80 hover:text-foreground"
      >
        <Sun class="size-5 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
        <Moon
          class="absolute size-5 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0"
        />
        <span class="sr-only">Toggle theme</span>
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-36 p-1" align="end">
    {#each themes as theme}
      {@const Icon = theme.icon}
      <button
        onclick={() => setTheme(theme.value)}
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Icon class="size-4" />
        <span class="flex-1 text-left">{theme.label}</span>
        {#if currentTheme === theme.value}
          <Check class="size-4 text-primary" />
        {/if}
      </button>
    {/each}
  </Popover.Content>
</Popover.Root>
