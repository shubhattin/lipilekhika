<!--
  The source box's file actions: open a .txt file into it, or save it as one. One icon with
  a small menu, since the row above the box has no room for two more icons on a phone.
-->
<script lang="ts">
  import { Button } from '~/lib/components/ui/button';
  import * as Popover from '~/lib/components/ui/popover';
  import { Download, FileText, FolderOpen } from 'lucide-svelte';
  import { TEXT_FILE_ACCEPT } from './text_file';

  let {
    onopen,
    ondownload,
    can_download
  }: {
    /** a file was picked */
    onopen: (file: File) => void;
    ondownload: () => void;
    can_download: boolean;
  } = $props();

  let open = $state(false);
  let file_input = $state<HTMLInputElement | null>(null);

  const ITEM =
    'flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50';
</script>

<input
  bind:this={file_input}
  type="file"
  accept={TEXT_FILE_ACCEPT}
  class="hidden"
  onchange={(e) => {
    const file = e.currentTarget.files?.[0];
    // reset, so picking the same file again still fires `change`
    e.currentTarget.value = '';
    if (file) onopen(file);
  }}
/>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="icon"
        class="size-8"
        title="Open or save a .txt file"
      >
        <FileText class="size-4" />
        <span class="sr-only">Open or save a .txt file</span>
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-56 p-1" align="start">
    <button
      type="button"
      class={ITEM}
      onclick={() => {
        open = false;
        file_input?.click();
      }}
    >
      <FolderOpen class="size-4 text-muted-foreground" />
      Open .txt file…
    </button>
    <button
      type="button"
      class={ITEM}
      disabled={!can_download}
      onclick={() => {
        open = false;
        ondownload();
      }}
    >
      <Download class="size-4 text-muted-foreground" />
      Save as .txt
    </button>
    <p class="border-t px-2 pt-1.5 pb-1 text-xs text-muted-foreground">
      Or drop a .txt file on the text box
    </p>
  </Popover.Content>
</Popover.Root>
