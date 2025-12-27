<script lang="ts">
  import { onMount } from 'svelte';
  import {
    transliterate,
    preloadScriptData,
    getAllOptions,
    SCRIPT_LIST,
    type ScriptListType,
    type TransliterationOptions
  } from '../../../../packages/js/src/index';
  import {
    createTypingContext,
    handleTypingBeforeInputEvent,
    clearTypingContextOnKeyDown,
    DEFAULT_USE_NATIVE_NUMERALS,
    DEFAULT_INCLUDE_INHERENT_VOWEL
  } from '../../../../packages/js/src/typing';
  // ^ import directly for real time development
  import { slide } from 'svelte/transition';
  import prettyMs from 'pretty-ms';

  import { Button } from '$lib/components/ui/button';
  import * as Select from '$lib/components/ui/select';
  import { Switch } from '$lib/components/ui/switch';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Separator } from '$lib/components/ui/separator';
  import * as Popover from '$lib/components/ui/popover';
  import { KeyboardIcon, SettingsIcon } from 'lucide-svelte';

  const SCRIPTS = SCRIPT_LIST as ScriptListType[];
  const DEFAULT_FROM: ScriptListType = 'Devanagari';
  const DEFAULT_TO: ScriptListType = 'Normal';

  let fromScript = $state<ScriptListType>(DEFAULT_FROM);
  let toScript = $state<ScriptListType>(DEFAULT_TO);
  let inputText = $state('');
  let outputText = $state('');
  let options = $state<TransliterationOptions>({});
  let showOptions = $state(false);
  let availableOptions = $state<string[]>([]);
  let conversionTime = $state<string>('');
  let timeoutId: NodeJS.Timeout | undefined;

  let typing_enabled = $state(true);
  let useNativeNumerals = $state(DEFAULT_USE_NATIVE_NUMERALS);
  let includeInherentVowel = $state(DEFAULT_INCLUDE_INHERENT_VOWEL);

  let from_input_typing_context = $derived(createTypingContext(fromScript));

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    try {
      const startTime = performance.now();
      const result = await transliterate(inputText, fromScript, toScript, options);
      const endTime = performance.now();
      const timeTaken = endTime - startTime;

      conversionTime = prettyMs(timeTaken);
      // console.log(`Conversion took: ${conversionTime}`);
      // console.log([inputText, result]);
      outputText = result;

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

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

  $effect(() => {
    from_input_typing_context.updateUseNativeNumerals(useNativeNumerals);
  });

  $effect(() => {
    from_input_typing_context.updateIncludeInherentVowel(includeInherentVowel);
  });

  onMount(() => {
    preloadScriptData(fromScript);
    preloadScriptData(toScript);
  });
</script>

<div class="min-h-screen bg-background text-foreground">
  <div class="mx-auto max-w-5xl px-4 py-12 md:py-16">
    <form
      class="space-y-8 rounded-xl border border-border bg-card p-8 shadow-2xl"
      onsubmit={handleSubmit}
    >
      <!-- Script Selection Row -->
      <div class="flex flex-col items-stretch gap-4 sm:grid sm:grid-cols-3 sm:items-end sm:gap-6">
        <!-- From Script Select -->
        <div class="flex flex-col gap-2.5">
          <span class="text-sm font-medium tracking-wide text-muted-foreground">From script</span>
          <Select.Root type="single" bind:value={fromScript}>
            <Select.Trigger class="w-full">
              {fromScript}
            </Select.Trigger>
            <Select.Content>
              {#each SCRIPTS as script (script)}
                <Select.Item value={script} label={script} />
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Swap Button -->
        <div class="flex justify-center sm:pb-0.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Swap scripts"
            onclick={handleSwap}
            class="h-10 w-10 rounded-full text-lg"
          >
            ⇄
          </Button>
        </div>

        <!-- To Script Select -->
        <div class="flex flex-col gap-2.5">
          <span class="text-sm font-medium tracking-wide text-muted-foreground">To script</span>
          <Select.Root type="single" bind:value={toScript}>
            <Select.Trigger class="w-full">
              {toScript}
            </Select.Trigger>
            <Select.Content>
              {#each SCRIPTS as script (script)}
                <Select.Item value={script} label={script} />
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      <Separator />

      <!-- Options Section -->
      <div class="rounded-lg border border-border bg-card/50">
        <button
          type="button"
          class="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-accent/50"
          onclick={() => (showOptions = !showOptions)}
        >
          <span class="text-sm font-medium tracking-wide text-foreground">
            Transliteration Options
          </span>
          <svg
            class="h-5 w-5 text-muted-foreground transition-transform duration-200"
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
          <div class="border-t border-border px-5 py-4" transition:slide>
            {#if availableOptions.length === 0}
              <p class="text-sm text-muted-foreground">
                No options available for this combination.
              </p>
            {:else}
              <div class="space-y-4">
                {#each availableOptions as option (option)}
                  <div class="flex items-center justify-between gap-4">
                    <label
                      for={option}
                      class="flex cursor-pointer items-center gap-x-2 text-sm text-foreground sm:gap-x-4"
                    >
                      <Switch
                        id={option}
                        bind:checked={options[option as keyof TransliterationOptions]}
                      />
                      <span class="block max-w-40 truncate text-xs sm:max-w-full" title={option}>
                        {option.split(':')[1]}
                      </span>
                    </label>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Text Areas -->
      <div class="grid gap-6 md:grid-cols-2">
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <label
              for="source-text"
              class="text-sm font-medium tracking-wide text-muted-foreground"
            >
              Source text
            </label>
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted-foreground"
                >Use <span class="font-bold">Alt+x</span> to toggle</span
              >
              <label class="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <KeyboardIcon class="h-7 w-10" />
                <Switch bind:checked={typing_enabled} />
              </label>
              <Popover.Root>
                <Popover.Trigger>
                  <Button variant="ghost" size="icon" class="h-8 w-8">
                    <SettingsIcon class="h-4 w-4" />
                  </Button>
                </Popover.Trigger>
                <Popover.Content class="w-80">
                  <div class="space-y-4">
                    <h4 class="leading-none font-medium">Typing Options</h4>
                    <div class="space-y-3">
                      <div class="flex items-center justify-between gap-4">
                        <label for="use-native-numerals" class="flex flex-col gap-1 text-sm">
                          <span class="font-medium">Use Native Numerals</span>
                          <span class="text-xs text-muted-foreground"
                            >Convert numbers to script numerals</span
                          >
                        </label>
                        <Switch id="use-native-numerals" bind:checked={useNativeNumerals} />
                      </div>
                      <Separator />
                      <div class="flex items-center justify-between gap-4">
                        <label for="include-inherent-vowel" class="flex flex-col gap-1 text-sm">
                          <span class="font-medium">Include Inherent Vowel</span>
                          <span class="text-xs text-muted-foreground"
                            >Add inherent vowel (schwa) to consonants</span
                          >
                        </label>
                        <Switch id="include-inherent-vowel" bind:checked={includeInherentVowel} />
                      </div>
                    </div>
                  </div>
                </Popover.Content>
              </Popover.Root>
            </div>
          </div>
          <Textarea
            id="source-text"
            class="min-h-[180px] resize-none"
            placeholder="Enter text to transliterate..."
            bind:value={inputText}
            onbeforeinput={(e) =>
              handleTypingBeforeInputEvent(
                from_input_typing_context,
                e,
                (new_value) => (inputText = new_value),
                typing_enabled
              )}
            onblur={() => from_input_typing_context.clearContext()}
            onkeydown={(e) => {
              // Toggle typing on Alt+X
              if (e.altKey && (e.key === 'x' || e.key === 'X')) {
                e.preventDefault();
                typing_enabled = !typing_enabled;
                return;
              }
              clearTypingContextOnKeyDown(e, from_input_typing_context);
            }}
          />
        </div>

        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <label
              for="output-text"
              class="text-sm font-medium tracking-wide text-muted-foreground"
            >
              Converted output
            </label>
            {#if conversionTime}
              <span class="text-xs font-medium text-green-600 dark:text-green-400"
                >⏱ {conversionTime}</span
              >
            {/if}
          </div>
          <Textarea
            id="output-text"
            class="min-h-[180px] resize-none bg-muted/30"
            value={outputText}
            readonly
          />
        </div>
      </div>

      <!-- Submit Button -->
      <div class="flex justify-center pt-2">
        <Button type="submit" size="lg" class="px-12">Convert</Button>
      </div>
    </form>
  </div>
</div>
