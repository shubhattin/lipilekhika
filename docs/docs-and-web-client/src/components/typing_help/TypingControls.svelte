<script lang="ts">
  import type { TypingControls } from './layout';

  /** The keys which change how the typing works, as one compact box */
  let { controls, font }: { controls: TypingControls; font: string } = $props();

  const kbd =
    'inline-flex shrink-0 rounded border border-b-2 bg-background px-1.5 py-px font-mono text-xs font-semibold';
</script>

{#if controls.separator || controls.joiners.length > 0 || controls.literals.length > 0}
  <section class="mt-6 rounded-lg border bg-muted/30 p-3 sm:p-4">
    <div class="flex flex-wrap items-baseline gap-x-2">
      <h3 class="text-sm font-semibold">Typing controls</h3>
      <span class="text-xs text-muted-foreground">keys that change how you type</span>
    </div>

    {#if controls.separator || controls.joiners.length > 0}
      <ul class="mt-2.5 grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
        {#if controls.separator}
          {@const sep = controls.separator}
          <li class="flex items-start gap-2.5">
            <kbd class={kbd}>q</kbd>
            <div class="min-w-0">
              <div>Keeps two keys apart</div>
              <div class="text-xs text-muted-foreground">
                <code>{sep.split}</code> →
                <span class="text-sm text-foreground {font}">{sep.split_text}</span>, not
                <code>{sep.joined}</code>
                →
                <span class="text-sm {font}">{sep.joined_text}</span>
              </div>
            </div>
          </li>
        {/if}
        {#each controls.joiners as joiner (joiner.key)}
          <li class="flex items-start gap-2.5">
            <kbd class={kbd}>{joiner.key}</kbd>
            <div class="min-w-0">
              <div>{joiner.name}</div>
              {#if joiner.example}
                <div class="text-xs text-muted-foreground">
                  <code>{joiner.example.input}</code> →
                  <span class="text-sm text-foreground {font}">{joiner.example.output}</span>
                </div>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}

    {#if controls.literals.length > 0}
      <div class="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
        <span class="mr-1 text-xs text-muted-foreground">Literal letters</span>
        {#each controls.literals as literal (literal.key)}
          <span
            class="inline-flex items-center gap-1 rounded-md border bg-background px-1.5 py-0.5 text-xs"
          >
            <code class="font-semibold">{literal.key}</code>
            <span class="text-muted-foreground">→</span>
            <span>{literal.text}</span>
          </span>
        {/each}
      </div>
    {/if}
  </section>
{/if}
