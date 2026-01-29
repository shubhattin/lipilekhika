<script lang="ts">
  import { Button } from '~/lib/components/ui/button';
  import { X } from 'lucide-svelte';
  import { Icon } from 'svelte-icons-pack';
  import { SiAndroid, SiWindows, SiLinux, SiGoogleplay } from 'svelte-icons-pack/si';
  import { detected_platform_atom } from '../tools/pwa_state';
  import PWAInstall from './PWAInstall.svelte';

  const WINDOWS_DOWNLOAD_URL = '/redirect/pc-app-release-win-download';
  const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.shubhattin.lipilekhika';
  const LINUX_FCITX_PLUGIN_URL =
    'https://github.com/shubhattin/lipilekhika/blob/main/plugins/fcitx5/README.md';

  let dismissed = $state(false);
  // const platform = $detected_platform_atom;
  let platform = 'windows';

  // Only show platform prompt for supported desktop/mobile platforms
  const showPlatformPrompt =
    platform === 'android' || platform === 'windows' || platform === 'linux';
</script>

{#if !dismissed && showPlatformPrompt}
  {#if platform === 'android'}
    <!-- Android: Play Store download -->
    <div
      class="mb-4 flex items-center gap-2.5 rounded-lg border border-emerald-200/80 bg-linear-to-r from-emerald-50/90 to-emerald-100/70 px-3 py-2.5 shadow-sm backdrop-blur dark:border-emerald-800/60 dark:from-emerald-950/50 dark:to-emerald-900/40"
      role="status"
      aria-live="polite"
    >
      <div
        class="flex size-9 shrink-0 items-center justify-center rounded-md bg-emerald-600 dark:bg-emerald-700"
      >
        <Icon src={SiAndroid} className="size-5 fill-white" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium text-emerald-900 dark:text-emerald-100">
          Get the Android App
        </div>
        <div class="truncate text-xs text-emerald-600 dark:text-emerald-400">
          Available on Play Store
        </div>
      </div>
      <Button
        size="sm"
        class="h-8 shrink-0 bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icon src={SiGoogleplay} className="mr-1 size-3.5 fill-current" />
        Install
      </Button>
      <button
        type="button"
        class="shrink-0 rounded p-1 text-emerald-500 transition-colors hover:bg-emerald-200/60 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-800/40 dark:hover:text-emerald-300"
        onclick={() => (dismissed = true)}
        aria-label="Dismiss"
      >
        <X class="size-4" />
      </button>
    </div>
  {:else if platform === 'windows'}
    <!-- Windows: Desktop app download -->
    <div
      class="mb-4 flex items-center gap-2.5 rounded-lg border border-cyan-200/80 bg-linear-to-r from-cyan-50/90 to-sky-50/70 px-3 py-2.5 shadow-sm backdrop-blur dark:border-cyan-800/60 dark:from-cyan-950/50 dark:to-cyan-900/40"
      role="status"
      aria-live="polite"
    >
      <div
        class="flex size-9 shrink-0 items-center justify-center rounded-md bg-cyan-500 dark:bg-cyan-600"
      >
        <Icon src={SiWindows} className="size-5 fill-white" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium text-cyan-900 dark:text-cyan-100">
          Get the Windows App
        </div>
        <div class="truncate text-xs text-cyan-600 dark:text-cyan-400">
          Native desktop experience
        </div>
      </div>
      <Button
        size="sm"
        class="h-8 shrink-0 bg-cyan-500 px-3 text-xs text-white hover:bg-cyan-600 dark:bg-cyan-500 dark:hover:bg-cyan-400"
        href={WINDOWS_DOWNLOAD_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Download
      </Button>
      <button
        type="button"
        class="shrink-0 rounded p-1 text-cyan-500 transition-colors hover:bg-cyan-200/60 hover:text-cyan-700 dark:text-cyan-400 dark:hover:bg-cyan-800/40 dark:hover:text-cyan-300"
        onclick={() => (dismissed = true)}
        aria-label="Dismiss"
      >
        <X class="size-4" />
      </button>
    </div>
  {:else if platform === 'linux'}
    <!-- Linux: Fcitx5 plugin -->
    <div
      class="mb-4 flex items-center gap-2.5 rounded-lg border border-slate-200/80 bg-linear-to-r from-slate-50/90 to-slate-100/70 px-3 py-2.5 shadow-sm backdrop-blur dark:border-slate-700/60 dark:from-slate-900/50 dark:to-slate-800/40"
      role="status"
      aria-live="polite"
    >
      <div
        class="flex size-9 shrink-0 items-center justify-center rounded-md bg-slate-700 dark:bg-slate-600"
      >
        <Icon src={SiLinux} className="size-5 fill-white" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          Linux Fcitx5 Plugin
        </div>
        <div class="truncate text-xs text-slate-500 dark:text-slate-400">
          System-wide input method
        </div>
      </div>
      <Button
        size="sm"
        class="h-8 shrink-0 bg-slate-700 px-3 text-xs text-white hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500"
        href={LINUX_FCITX_PLUGIN_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        View
      </Button>
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
{:else}
  <!-- Fallback to PWA for iOS, macOS, or unknown platforms -->
  <PWAInstall />
{/if}
