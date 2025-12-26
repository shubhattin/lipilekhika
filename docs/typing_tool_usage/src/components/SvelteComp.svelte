<script lang="ts">
  import { SCRIPT_LIST, type ScriptListType } from 'lipilekhika';
  import {
    createTypingContext,
    clearTypingContextOnKeyDown,
    handleTypingBeforeInputEvent
  } from 'lipilekhika/typing';

  let textarea_text = $state('');
  let input_text = $state('');

  let selected_script = $state<ScriptListType>('Devanagari');

  let textarea_typing_context = $derived(createTypingContext(selected_script));
  let input_typing_context = $derived(createTypingContext(selected_script));

  // Eagerly access contexts to trigger background preloading
  // to avoid lazy evaluation of `$derived`
  $effect(() => {
    textarea_typing_context.ready;
    input_typing_context.ready;
  });
</script>

<div class="mx-auto max-w-[700px] p-8 font-sans">
  <div class="mb-10 text-center">
    <h1 class="mb-2 text-xl font-bold tracking-tight text-slate-200">Svelte</h1>
    <p class="text-[0.95rem] text-slate-400">Lipi Lekhika Typing Tool Usage Example</p>
  </div>

  <div class="mb-7">
    <label for="script-select" class="mb-2 block text-sm font-semibold tracking-wide text-slate-300"
      >Select Script</label
    >
    <select
      id="script-select"
      bind:value={selected_script}
      class="w-full cursor-pointer appearance-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 pr-10 text-base text-slate-200 transition-all duration-200 hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
    >
      {#each SCRIPT_LIST as script}
        <option value={script}>{script}</option>
      {/each}
    </select>
  </div>

  <div class="mb-7">
    <textarea
      placeholder="Start typing here..."
      value={textarea_text}
      onbeforeinput={(e) =>
        handleTypingBeforeInputEvent(
          textarea_typing_context,
          e,
          (new_value) => (textarea_text = new_value)
        )}
      onblur={() => textarea_typing_context.clearContext()}
      onkeydown={(e) => clearTypingContextOnKeyDown(e, textarea_typing_context)}
      class="min-h-[150px] w-full resize-y rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-base leading-relaxed text-slate-200 transition-all duration-200 placeholder:text-slate-500 hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
    ></textarea>
  </div>

  <div class="mb-7">
    <input
      placeholder="Type here..."
      type="text"
      value={input_text}
      onbeforeinput={(e) =>
        handleTypingBeforeInputEvent(input_typing_context, e, (new_value) => (input_text = new_value))}
      onblur={() => input_typing_context.clearContext()}
      onkeydown={(e) => clearTypingContextOnKeyDown(e, input_typing_context)}
      class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-base text-slate-200 transition-all duration-200 placeholder:text-slate-500 hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
    />
  </div>
</div>
