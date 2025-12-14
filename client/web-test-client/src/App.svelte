<script lang="ts">
  import { onMount } from 'svelte';
  import {
    transliterate,
    preloadScriptData,
    getAllOptions,
    SCRIPT_LIST,
    type ScriptListType,
    type TransliterationOptions
  } from 'lipilekhika';
  import Switch from './Switch.svelte';
  import { slide } from 'svelte/transition';
  import prettyMs from 'pretty-ms';

  const SCRIPTS = SCRIPT_LIST as ScriptListType[];
  const DEFAULT_FROM: ScriptListType = 'Devanagari';
  const DEFAULT_TO: ScriptListType = 'Romanized';

  let fromScript = $state<ScriptListType>(DEFAULT_FROM);
  let toScript = $state<ScriptListType>(DEFAULT_TO);
  let inputText = $state('');
  let outputText = $state('');
  let options = $state<TransliterationOptions>({});
  let showOptions = $state(false);
  let availableOptions = $state<string[]>([]);
  let conversionTime = $state<string>('');
  let timeoutId: number | undefined;

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    try {
      const startTime = performance.now();
      const result = await transliterate(inputText, fromScript, toScript, options);
      const endTime = performance.now();
      const timeTaken = endTime - startTime;

      conversionTime = prettyMs(timeTaken);
      console.log(`Conversion took: ${conversionTime}`);
      console.log(result);
      outputText = result;

      // Clear any existing timeout
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      // Hide the time after 5 seconds
      timeoutId = setTimeout(() => {
        conversionTime = '';
      }, 5000);
    } catch (error) {
      console.error(error);
      outputText = '';
      conversionTime = '';
    }
  };

  const handleSwap = () => {
    const currentFrom = fromScript;
    const currentTo = toScript;
    const currentInputText = inputText;
    const currentOutputText = outputText;
    fromScript = currentTo;
    toScript = currentFrom;
    inputText = currentOutputText;
    outputText = currentInputText;
  };

  $effect(() => {
    getAllOptions(fromScript, toScript).then((all_options) => {
      options = Object.fromEntries(all_options.map((v) => [v, false]));
      availableOptions = all_options;
    });
  });

  onMount(() => {
    preloadScriptData(fromScript);
    preloadScriptData(toScript);
  });
</script>

<div class="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
  <div class="mx-auto max-w-5xl px-4 py-12 md:py-16">
    <form
      class="space-y-8 rounded-3xl bg-slate-900/60 p-8 shadow-2xl ring-1 shadow-black/40 ring-white/5 backdrop-blur"
      onsubmit={handleSubmit}
    >
      <div class="flex flex-col items-stretch gap-4 sm:grid sm:grid-cols-3 sm:items-end sm:gap-6">
        <label class="flex flex-col gap-2 sm:w-full">
          <span class="text-sm tracking-wider text-slate-400 uppercase">From script</span>
          <select
            class="rounded-2xl border border-slate-800/70 bg-slate-950/80 px-4 py-3 text-base transition outline-none hover:border-teal-400/60 focus:border-teal-400 focus:ring focus:ring-teal-500/30"
            bind:value={fromScript}
          >
            {#each SCRIPTS as script}
              <option value={script} class="bg-slate-900 text-white">
                {script}
              </option>
            {/each}
          </select>
        </label>
        <button
          type="button"
          aria-label="Swap scripts"
          class="inline-flex h-12 w-12 items-center justify-center self-center rounded-full border border-slate-800/70 bg-slate-950/80 text-lg font-semibold text-teal-200 shadow-sm shadow-black/30 transition hover:border-teal-400/60 hover:text-teal-100 focus-visible:ring focus-visible:ring-teal-500/40 focus-visible:outline-none sm:h-12 sm:w-12 sm:justify-self-center"
          onclick={handleSwap}
        >
          ⇄
        </button>
        <label class="flex flex-col gap-2 sm:w-full">
          <span class="text-sm tracking-wider text-slate-400 uppercase">To script</span>
          <select
            class="rounded-2xl border border-slate-800/70 bg-slate-950/80 px-4 py-3 text-base transition outline-none hover:border-teal-400/60 focus:border-teal-400 focus:ring focus:ring-teal-500/30"
            bind:value={toScript}
          >
            {#each SCRIPTS as script}
              <option value={script} class="bg-slate-900 text-white">
                {script}
              </option>
            {/each}
          </select>
        </label>
      </div>

      <!-- Options Section -->
      <div class="overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/50">
        <button
          type="button"
          class="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-900/40"
          onclick={() => (showOptions = !showOptions)}
        >
          <span class="text-sm font-medium tracking-wider text-slate-300 uppercase">
            Transliteration Options
          </span>
          <svg
            class="h-5 w-5 text-slate-400 transition-transform duration-200"
            class:rotate-180={showOptions}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"
            ></path>
          </svg>
        </button>

        {#if showOptions}
          <div class="border-t border-slate-800/60 px-5 py-4" transition:slide>
            <div class="space-y-4">
              {#each availableOptions as option}
                <label class="group flex cursor-pointer items-center gap-3">
                  <Switch
                    bind:checked={options[option as keyof TransliterationOptions]}
                    label="Toggle {option}"
                    trackClass="h-6 w-11"
                    thumbClass="h-4 w-4"
                  />
                  <span class="text-sm text-slate-300 transition group-hover:text-slate-100">
                    {option}
                  </span>
                </label>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <label class="flex flex-col gap-3">
          <span class="text-sm tracking-wider text-slate-400 uppercase">Source text</span>
          <textarea
            class="min-h-[180px] rounded-2xl border border-slate-800/60 bg-slate-950/80 px-5 py-4 text-base text-white placeholder:text-slate-500 focus:border-teal-400 focus:ring focus:ring-teal-500/30"
            placeholder="Text"
            bind:value={inputText}
          ></textarea>
        </label>

        <label class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-sm tracking-wider text-slate-400 uppercase">Converted output</span>
            {#if conversionTime}
              <span class="text-xs font-medium text-emerald-400">⏱ {conversionTime}</span>
            {/if}
          </div>
          <textarea
            class="min-h-[180px] rounded-2xl border border-slate-800/60 bg-slate-900/70 px-5 py-4 text-base text-teal-100"
            value={outputText}
            readOnly
          ></textarea>
        </label>
      </div>

      <div class="flex flex-col items-center justify-center gap-3">
        <button
          type="submit"
          class="inline-flex items-center justify-center rounded-full bg-linear-to-r from-teal-500 via-emerald-500 to-lime-400 px-8 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-teal-500/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Convert
        </button>
      </div>
    </form>
  </div>
</div>
