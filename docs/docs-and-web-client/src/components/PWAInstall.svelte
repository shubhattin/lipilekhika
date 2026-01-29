<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '~/lib/components/ui/button';
  import { X, Download, Share2, ArrowRight } from 'lucide-svelte';
  import { Icon } from 'svelte-icons-pack';
  import { SiApple } from 'svelte-icons-pack/si';
  import {
    pwa_state_atom,
    is_ios_atom,
    is_ios_safari_atom,
    type BeforeInstallPromptEvent
  } from '../tools/pwa_state';

  let dismissed = $state(false);

  function patchPwaState(
    patch: Partial<{
      install_event_fired: boolean;
      event_triggerer: BeforeInstallPromptEvent | null;
      is_installed: boolean;
    }>
  ) {
    pwa_state_atom.set({ ...pwa_state_atom.get(), ...patch });
  }

  async function triggerInstall() {
    const ev = pwa_state_atom.get().event_triggerer;
    if (!ev) return;

    try {
      await ev.prompt();
      // userChoice resolves after prompt is shown
      await ev.userChoice;
    } catch (e) {
      console.error('PWA install prompt failed:', e);
    } finally {
      // Clear the cached event either way to avoid stale prompts
      patchPwaState({ event_triggerer: null, install_event_fired: false });
    }
  }

  onMount(() => {
    if (typeof window === 'undefined') return;

    const isStandalone = () =>
      window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
      // iOS Safari
      (window.navigator as any).standalone === true;

    const updateInstalled = () => {
      if (isStandalone()) {
        patchPwaState({ is_installed: true, event_triggerer: null, install_event_fired: false });
      }
    };

    updateInstalled();

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault?.();
      patchPwaState({
        install_event_fired: true,
        event_triggerer: e as BeforeInstallPromptEvent,
        is_installed: false
      });
    };

    const onAppInstalled = () => {
      patchPwaState({ is_installed: true, event_triggerer: null, install_event_fired: false });
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as any);
    window.addEventListener('appinstalled', onAppInstalled);

    const mql = window.matchMedia?.('(display-mode: standalone)');
    const onMqlChange = () => updateInstalled();
    mql?.addEventListener?.('change', onMqlChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as any);
      window.removeEventListener('appinstalled', onAppInstalled);
      mql?.removeEventListener?.('change', onMqlChange);
    };
  });
</script>

{#if !dismissed && !$pwa_state_atom.is_installed}
  {#if $pwa_state_atom.event_triggerer}
    <!-- Generic PWA install prompt (Chrome/Edge) -->
    <div
      class="mb-4 flex items-center gap-2.5 rounded-lg border border-violet-200/80 bg-linear-to-r from-violet-50/90 to-violet-100/70 px-3 py-2.5 shadow-sm backdrop-blur dark:border-violet-800/60 dark:from-violet-950/50 dark:to-violet-900/40"
      role="status"
      aria-live="polite"
    >
      <div
        class="flex size-9 shrink-0 items-center justify-center rounded-md bg-violet-600 dark:bg-violet-700"
      >
        <Download class="size-5 text-white" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium text-violet-900 dark:text-violet-100">
          Install Lipi Lekhika
        </div>
        <div class="truncate text-xs text-violet-600 dark:text-violet-400">
          Get a faster, app-like experience
        </div>
      </div>
      <Button
        size="sm"
        class="h-8 shrink-0 bg-violet-600 px-3 text-xs text-white hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500"
        onclick={triggerInstall}
      >
        Install
      </Button>
      <button
        type="button"
        class="shrink-0 rounded p-1 text-violet-500 transition-colors hover:bg-violet-200/60 hover:text-violet-700 dark:text-violet-400 dark:hover:bg-violet-800/40 dark:hover:text-violet-300"
        onclick={() => (dismissed = true)}
        aria-label="Dismiss"
      >
        <X class="size-4" />
      </button>
    </div>
  {:else if $is_ios_safari_atom}
    <!-- iOS Safari: Share → Add to Home Screen -->
    <div
      class="mb-4 flex items-center gap-2.5 rounded-lg border border-slate-200/80 bg-linear-to-r from-slate-50/90 to-slate-100/70 px-3 py-2.5 shadow-sm backdrop-blur dark:border-slate-700/60 dark:from-slate-900/50 dark:to-slate-800/40"
      role="status"
      aria-live="polite"
    >
      <div
        class="flex size-9 shrink-0 items-center justify-center rounded-md bg-slate-800 dark:bg-slate-700"
      >
        <Icon src={SiApple} className="size-5 fill-white" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          Install on iPhone/iPad
        </div>
        <div class="truncate text-xs text-slate-500 dark:text-slate-400">
          Tap <Share2 class="mb-0.5 inline size-3" /> Share <ArrowRight
            class="mx-0.5 inline size-3"
          /> Add to Home Screen
        </div>
      </div>
      <button
        type="button"
        class="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700/40 dark:hover:text-slate-300"
        onclick={() => (dismissed = true)}
        aria-label="Dismiss"
      >
        <X class="size-4" />
      </button>
    </div>
  {:else if $is_ios_atom}
    <!-- iOS non-Safari: Open in Safari first -->
    <div
      class="mb-4 flex items-center gap-2.5 rounded-lg border border-slate-200/80 bg-linear-to-r from-slate-50/90 to-slate-100/70 px-3 py-2.5 shadow-sm backdrop-blur dark:border-slate-700/60 dark:from-slate-900/50 dark:to-slate-800/40"
      role="status"
      aria-live="polite"
    >
      <div
        class="flex size-9 shrink-0 items-center justify-center rounded-md bg-slate-800 dark:bg-slate-700"
      >
        <Icon src={SiApple} className="size-5 fill-white" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          Install on iOS
        </div>
        <div class="text-xs leading-snug text-slate-500 dark:text-slate-400">
          Open in Safari, tap <Share2 class="mb-0.5 inline size-3" />
          <ArrowRight class="mx-0.5 inline size-3" /> Add to Home Screen
        </div>
      </div>
      <button
        type="button"
        class="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700/40 dark:hover:text-slate-300"
        onclick={() => (dismissed = true)}
        aria-label="Dismiss"
      >
        <X class="size-4" />
      </button>
    </div>
  {/if}
{/if}
