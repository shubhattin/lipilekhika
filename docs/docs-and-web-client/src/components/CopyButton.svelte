<script lang="ts">
  import Button from '~/lib/components/ui/button/button.svelte';
  import { Icon } from 'svelte-icons-pack';
  import { BsCopy, BsCheck2 } from 'svelte-icons-pack/bs';
  import { cn } from '~/lib/utils';

  let {
    text,
    label = 'Copy text',
    class: className = ''
  }: {
    /** Text to copy, or a getter evaluated on click */
    text: string | (() => string);
    label?: string;
    class?: string;
  } = $props();

  let copied = $state(false);
  let reset_timeout: ReturnType<typeof setTimeout> | undefined;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(typeof text === 'function' ? text() : text);
      copied = true;
      clearTimeout(reset_timeout);
      reset_timeout = setTimeout(() => (copied = false), 1500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };
</script>

<Button
  variant="ghost"
  size="icon"
  class={cn('size-8', className)}
  onclick={copy}
  title={copied ? 'Copied' : label}
>
  {#if copied}
    <Icon src={BsCheck2} className="size-4 fill-emerald-600 dark:fill-emerald-400" />
  {:else}
    <Icon src={BsCopy} className="size-4" />
  {/if}
  <span class="sr-only">{copied ? 'Copied' : label}</span>
</Button>
