<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
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
    <div
      class="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between"
      role="status"
      aria-live="polite"
    >
      <div class="space-y-1">
        <div class="text-sm font-semibold">Install Lipi Lekhika</div>
        <div class="text-xs text-muted-foreground">
          Get a faster, app-like experience
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Button size="sm" onclick={triggerInstall}>Install</Button>
        <Button size="sm" variant="ghost" onclick={() => (dismissed = true)}>Not now</Button>
      </div>
    </div>
  {:else if $is_ios_safari_atom}
    <div
      class="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between"
      role="status"
      aria-live="polite"
    >
      <div class="space-y-1">
        <div class="text-sm font-semibold">Install on iPhone/iPad</div>
        <div class="text-xs text-muted-foreground">
          Tap <span class="font-medium">Share</span> →
          <span class="font-medium">Add to Home Screen</span>.
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Button size="sm" variant="ghost" onclick={() => (dismissed = true)}>Dismiss</Button>
      </div>
    </div>
  {:else if $is_ios_atom}
    <div
      class="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between"
      role="status"
      aria-live="polite"
    >
      <div class="space-y-1">
        <div class="text-sm font-semibold">Install on iOS</div>
        <div class="text-xs text-muted-foreground">
          Open this page in <span class="font-medium">Safari</span>, then use
          <span class="font-medium">Share</span> →
          <span class="font-medium">Add to Home Screen</span>.
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Button size="sm" variant="ghost" onclick={() => (dismissed = true)}>Dismiss</Button>
      </div>
    </div>
  {/if}
{/if}
