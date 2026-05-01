<!--
  Carta-style stack (minimal):
  - Single source of truth: bind:value on <textarea> only.
  - Underlay is a non-interactive mirror (here plain text; Carta uses syntax-highlighted HTML).
  - Textarea: color transparent + caret-color so you see the mirror through typing.
  - Underlay: pointer-events none, user-select none — all gestures hit the textarea.
  Lipi Lekhika: only handleTypingBeforeInputEvent on the textarea (no contenteditable path).
  - <textarea> is the only editor surface; optional mirror uses Shiki markdown HTML (like carta-md).
  - Plain mode: mirror shows escaped text. Shiki mode: mirror is sanitized {@html}.
-->
<script lang="ts">
  import type { ScriptListType } from 'lipilekhika';
  import {
    createTypingContext,
    clearTypingContextOnKeyDown,
    handleTypingBeforeInputEvent
  } from 'lipilekhika/typing';
  import DOMPurify from 'isomorphic-dompurify';
  import { onMount } from 'svelte';
  import { createHighlighter, type Highlighter } from 'shiki';

  const SHIKI_THEME = 'github-dark' as const;
  const SHIKI_DEBOUNCE_MS = 10;

  let {
    value = $bindable(''),
    script,
    placeholder = '',
    textareaId = '',
    /** When true, mirror runs source through Shiki as `markdown` (debounced) + DOMPurify. */
    shikiMarkdown = false
  }: {
    value?: string;
    script: ScriptListType;
    placeholder?: string;
    textareaId?: string;
    shikiMarkdown?: boolean;
  } = $props();

  let ctx = $derived(createTypingContext(script));
  let textareaEl: HTMLTextAreaElement | undefined = $state();
  let shikiHighlighter: Highlighter | null = $state(null);
  let mirrorHtml = $state('');

  let debounceId: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    ctx.ready;
  });

  function runShikiMirror(src: string) {
    const hl = shikiHighlighter;
    if (!hl || !shikiMarkdown) return;
    if (!src) {
      mirrorHtml = '';
      return;
    }
    const raw = hl.codeToHtml(src, { lang: 'markdown', theme: SHIKI_THEME });
    mirrorHtml = DOMPurify.sanitize(raw);
  }

  function scheduleShikiMirror(src: string) {
    if (!shikiMarkdown) return;
    clearTimeout(debounceId);
    debounceId = setTimeout(() => runShikiMirror(src), SHIKI_DEBOUNCE_MS);
  }

  onMount(() => {
    if (!shikiMarkdown) return;
    let cancelled = false;
    void (async () => {
      const hl = await createHighlighter({
        themes: [SHIKI_THEME],
        langs: ['markdown']
      });
      if (cancelled) {
        return;
      }
      shikiHighlighter = hl;
      runShikiMirror(value);
    })();
    return () => {
      cancelled = true;
      clearTimeout(debounceId);
      shikiHighlighter = null;
    };
  });

  $effect(() => {
    if (!shikiMarkdown) return;
    value;
    if (!shikiHighlighter) return;
    scheduleShikiMirror(value);
    return () => clearTimeout(debounceId);
  });

  /** Match Carta: grow textarea with content so the mirror stays aligned vertically. */
  function syncHeight() {
    const el = textareaEl;
    if (!el) return;
    el.style.height = '0';
    el.style.height = `${el.scrollHeight}px`;
  }

  $effect(() => {
    value;
    queueMicrotask(syncHeight);
  });
</script>

<div
  class="relative w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-800 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10"
>
  <div class="relative min-h-[150px] w-full">
    <div
      class:shiki-mirror={shikiMarkdown}
      class="pointer-events-none absolute inset-0 z-0 box-border min-h-[150px] w-full px-4 py-3 text-base leading-relaxed wrap-break-word whitespace-pre-wrap text-slate-200 select-none"
      aria-hidden="true"
    >
      {#if shikiMarkdown && mirrorHtml && value.length > 0}
        {@html mirrorHtml}
      {:else if value.length > 0}
        {value}
      {:else}
        <span class="text-slate-500">{placeholder}</span>
      {/if}
    </div>
    <!-- OR simpler mirror approach -->
    <!-- <div
      class="pointer-events-none absolute inset-0 z-0 box-border min-h-[150px] w-full px-4 py-3 text-base leading-relaxed wrap-break-word whitespace-pre-wrap text-slate-200 select-none"
      aria-hidden="true"
      contenteditable="true"
      bind:innerText={value}
    >
      {#if value.length === 0}
        <span class="text-slate-500">"Start typing here..."</span>
      {/if}
    </div> -->
    <textarea
      id={textareaId || undefined}
      bind:this={textareaEl}
      bind:value
      rows="1"
      class="relative z-1 box-border min-h-[150px] w-full resize-none border-0 bg-transparent px-4 py-3 text-base leading-relaxed text-transparent caret-slate-100 outline-none placeholder:text-slate-500"
      spellcheck="false"
      {placeholder}
      onbeforeinput={(e) => handleTypingBeforeInputEvent(ctx, e, (v) => (value = v))}
      oninput={syncHeight}
      onblur={() => ctx.clearContext()}
      onkeydown={(e) => clearTypingContextOnKeyDown(e, ctx)}
    ></textarea>
  </div>
</div>

<style>
  /* Map Shiki’s pre/code into the same flow metrics as the textarea (see carta-md Input.svelte). */
  .shiki-mirror :global(pre.shiki) {
    margin: 0;
    padding: 0;
    background-color: transparent !important;
    overflow: visible;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    letter-spacing: inherit;
    tab-size: 4;
  }

  .shiki-mirror :global(.shiki code) {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    letter-spacing: inherit;
  }

  .shiki-mirror :global(.shiki) {
    background-color: transparent !important;
  }
</style>
