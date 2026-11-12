<script lang="ts">
  import { onMount, untrack, type Snippet } from 'svelte';
  import {
    type transliterate,
    preloadScriptData,
    getAllOptions,
    type ScriptListType,
    type TransliterationOptions
  } from 'lipilekhika';
  import {
    createTypingContext,
    handleTypingBeforeInputEvent,
    clearTypingContextOnKeyDown,
    DEFAULT_USE_NATIVE_NUMERALS,
    DEFAULT_INCLUDE_INHERENT_VOWEL
  } from 'lipilekhika/typing';
  // ^ import directly for real time development
  import { getFontClass } from '$components/script/font_list';
  // import prettyMs from 'pretty-ms';

  import { Button } from '~/lib/components/ui/button';
  import { Switch } from '~/lib/components/ui/switch';
  import { Textarea } from '~/lib/components/ui/textarea';
  import { Separator } from '~/lib/components/ui/separator';
  import * as Popover from '~/lib/components/ui/popover';
  import { ArrowLeftRight, KeyboardIcon, SettingsIcon, X } from 'lucide-svelte';
  import { Icon } from 'svelte-icons-pack';
  import { BiHelpCircle } from 'svelte-icons-pack/bi';
  import CopyButton from './CopyButton.svelte';
  import ScriptSeleector from './script/ScriptSelector.svelte';
  import CustomOptions from './script/CustomOptions.svelte';
  import PresetSelector from './script/PresetSelector.svelte';
  import { SiConvertio } from 'svelte-icons-pack/si';
  import Label from '~/lib/components/ui/label/label.svelte';
  import { type PresetListType, PRESETS } from '~/tools/presets';

  let {
    input_text = $bindable(),
    typing_script = $bindable(),
    to_script = $bindable(),
    pwa_snippet,
    header_snippet,
    transliterate_func,
    current_preset = $bindable('none'),
    useNativeNumerals = $bindable(DEFAULT_USE_NATIVE_NUMERALS),
    includeInherentVowel = $bindable(DEFAULT_INCLUDE_INHERENT_VOWEL),
    container_class = 'mt-12 flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-4 pt-4'
  }: {
    input_text: string;
    typing_script: ScriptListType;
    to_script: ScriptListType;
    pwa_snippet?: Snippet;
    /** Optional content above the converter card */
    header_snippet?: Snippet;
    transliterate_func: typeof transliterate;
    current_preset?: PresetListType;
    useNativeNumerals: boolean;
    includeInherentVowel: boolean;
    /** Classes of the outermost wrapper, lets each host (web, desktop) set its own page spacing */
    container_class?: string;
  } = $props();

  let source_textarea = $state<HTMLTextAreaElement | null>(null);

  const countWords = (text: string) => {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  };
  const formatWords = (count: number) => `${count} ${count === 1 ? 'word' : 'words'}`;

  const clearInput = () => {
    from_input_typing_context.clearContext();
    input_text = '';
    source_textarea?.focus();
  };

  let outputText = $state('');
  let options = $state<TransliterationOptions>({});
  let availableOptions = $state<string[]>([]);
  // let conversionTime = $state<string>('');
  let timeoutId: NodeJS.Timeout | undefined;

  let typing_enabled = $state(true);

  let from_input_typing_context = $derived(createTypingContext(typing_script));

  let typing_modal_open = $state(false);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    try {
      const startTime = performance.now();
      const result = await transliterate_func(input_text, typing_script, to_script, options);
      const endTime = performance.now();
      const timeTaken = endTime - startTime;

      // conversionTime = prettyMs(timeTaken);
      // console.log(`Conversion took: ${conversionTime}`);
      // console.log([inputText, result]);
      outputText = result;

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        // conversionTime = '';
      }, 5000);
    } catch (error) {
      console.error(error);
      outputText = '';
      // conversionTime = '';
    }
  };

  const handleSwap = () => {
    const currentFrom = typing_script;
    const currentTo = to_script;
    const currentInputText = input_text;
    const currentOutputText = outputText;
    typing_script = currentTo;
    to_script = currentFrom;
    input_text = currentOutputText;
    outputText = currentInputText;
  };

  // Flag to track if options are being set programmatically (to avoid resetting preset)
  let isApplyingPreset = false;
  // Flag to track if preset was reset due to manual option change (to avoid reapplying "none" preset)
  let isResettingPresetDueToManualChange = false;
  // Track previous preset to detect actual user-initiated preset changes
  let previousPreset: PresetListType = current_preset;

  // Apply preset options when preset changes or scripts change
  $effect(() => {
    const _currentPreset = current_preset;
    const _typingScript = typing_script;
    const _toScript = to_script;

    getAllOptions(_typingScript, _toScript).then((all_options) => {
      untrack(() => {
        availableOptions = all_options;

        // Skip applying options if preset was reset due to manual option change
        if (isResettingPresetDueToManualChange) {
          isResettingPresetDueToManualChange = false;
          previousPreset = _currentPreset;
          return;
        }

        isApplyingPreset = true;

        const newOptions: TransliterationOptions = Object.fromEntries(
          all_options.map((v) => [v, false])
        );

        const preset = PRESETS[_currentPreset];
        if (preset) {
          for (const rule of preset.direct_apply_rules) {
            if (all_options.includes(rule)) {
              newOptions[rule] = true;
            }
          }
          for (const conditional of preset.conditional_rules) {
            if (
              _typingScript === conditional.from &&
              _toScript === conditional.to &&
              all_options.includes(conditional.rule)
            ) {
              newOptions[conditional.rule] = true;
            }
          }
        }

        options = newOptions;
        previousPreset = _currentPreset;
        // Reset flag after a microtask to allow the options assignment to complete
        queueMicrotask(() => {
          isApplyingPreset = false;
        });
      });
    });
  });

  // Reset preset to 'none' when options are manually modified
  $effect(() => {
    // Track options changes
    $state.snapshot(options);

    untrack(() => {
      // Only reset if not applying preset programmatically and preset is not already 'none'
      if (!isApplyingPreset && current_preset !== 'none') {
        isResettingPresetDueToManualChange = true;
        current_preset = 'none';
      }
    });
  });

  $effect(() => {
    from_input_typing_context.updateUseNativeNumerals(useNativeNumerals);
  });

  $effect(() => {
    from_input_typing_context.updateIncludeInherentVowel(includeInherentVowel);
  });

  onMount(() => {
    const prom = [preloadScriptData(typing_script), preloadScriptData(to_script)];
    Promise.allSettled(prom).then(() => {
      handleSubmit(new SubmitEvent('submit'));
    });
  });

  $effect(() => {
    to_script;
    $state.snapshot(options);
    // on change of any of the above, re-run the handleSubmit
    untrack(() => {
      handleSubmit(new SubmitEvent('submit'));
    });
  });

  let auto_convert = $state(true);

  $effect(() => {
    input_text;
    untrack(() => {
      if (auto_convert) {
        handleSubmit(new SubmitEvent('submit'));
      }
    });
  });
</script>

<div class={container_class}>
  <div class="mx-auto w-full max-w-6xl px-0 sm:px-6">
    {@render header_snippet?.()}
    <form
      class="space-y-6 rounded-2xl border border-border bg-card p-4 shadow-2xl shadow-black/5 sm:space-y-8 sm:p-8 dark:shadow-black/30"
      onsubmit={handleSubmit}
    >
      <!-- From / To Sections -->
      <div class="relative grid gap-6 lg:grid-cols-2 lg:gap-14">
        <!-- Swap (desktop): sits in the gap between the two columns, level with the script selectors -->
        <div class="absolute top-[1.625rem] left-1/2 z-10 hidden -translate-x-1/2 lg:block">
          {@render swap_button()}
        </div>

        <!-- From Section -->
        <section class="flex min-w-0 flex-col gap-4">
          <div class="flex flex-col gap-2.5">
            <span class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >From</span
            >
            <ScriptSeleector bind:script={typing_script} />
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex min-h-8 items-center justify-between gap-2">
              <div class="flex items-center gap-1">
                <label
                  for="source-text"
                  class="mr-1 text-sm font-medium tracking-wide text-muted-foreground"
                >
                  Source text
                </label>
                <CopyButton text={() => input_text} label="Copy source text" />
                {#if typing_script !== 'Normal'}
                  <Button
                    variant="ghost"
                    size="icon"
                    class="size-8"
                    onclick={() => (typing_modal_open = true)}
                    title="Typing help"
                  >
                    <Icon src={BiHelpCircle} className="size-6 fill-sky-500 dark:fill-sky-400" />
                    <span class="sr-only">Typing Help</span>
                  </Button>
                {/if}
              </div>
              <div class="flex items-center gap-1.5">
                <label
                  class="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/40"
                  title="Realtime typing (Alt+X to toggle)"
                >
                  <KeyboardIcon class="size-5" />
                  <span class="hidden sm:inline">Typing</span>
                  <kbd
                    class="hidden rounded border border-border bg-muted px-1 font-mono text-[0.65rem] leading-4 sm:inline"
                    >Alt+X</kbd
                  >
                  <Switch bind:checked={typing_enabled} aria-label="Realtime typing" />
                </label>
                <Popover.Root>
                  <Popover.Trigger>
                    <Button variant="ghost" size="icon" class="size-8" title="Typing options">
                      <SettingsIcon class="size-4" />
                      <span class="sr-only">Typing options</span>
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
            <div class="relative">
              <Textarea
                id="source-text"
                bind:ref={source_textarea}
                autocomplete="off"
                spellcheck="false"
                autocapitalize="none"
                class={'field-sizing-fixed min-h-[200px] resize-none overflow-auto pb-8 text-base sm:min-h-[240px] md:min-h-[280px] md:text-base lg:min-h-[320px] xl:min-h-[360px] ' +
                  getFontClass(typing_script)}
                placeholder={typing_enabled && typing_script !== 'Normal'
                  ? `Type with English letters to write in ${typing_script}…`
                  : 'Enter text to transliterate…'}
                bind:value={input_text}
                onbeforeinput={(e) =>
                  handleTypingBeforeInputEvent(
                    from_input_typing_context,
                    e,
                    (new_value) => (input_text = new_value),
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
              <div
                class="pointer-events-none absolute right-2 bottom-2 left-3 flex items-center justify-between text-xs text-muted-foreground"
              >
                <span>{formatWords(countWords(input_text))}</span>
                {#if input_text}
                  <button
                    type="button"
                    class="pointer-events-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-accent/60 hover:text-foreground"
                    onclick={clearInput}
                    title="Clear source text"
                  >
                    <X class="size-3.5" />
                    Clear
                  </button>
                {/if}
              </div>
            </div>
          </div>
        </section>

        <!-- To Section -->
        <section class="flex min-w-0 flex-col gap-4">
          <div class="flex items-end justify-between gap-4">
            <div class="flex flex-col gap-2.5">
              <span class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                >To</span
              >
              <ScriptSeleector bind:script={to_script} have_normal_script={true} />
            </div>
            <div class="lg:hidden">
              {@render swap_button()}
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex min-h-8 items-center gap-1">
              <label
                for="output-text"
                class="mr-1 text-sm font-medium tracking-wide text-muted-foreground"
              >
                Output
              </label>
              <CopyButton text={() => outputText} label="Copy output text" />
              <div class="ml-auto flex items-center gap-2">
                {#if !auto_convert}
                  <Button type="submit" size="sm" variant="secondary" class="h-8 gap-1.5 font-semibold">
                    <Icon src={SiConvertio} className="size-4" />
                    Convert
                  </Button>
                {/if}
                <Label class="cursor-pointer" title="Convert while typing">
                  <span class="text-xs font-medium text-muted-foreground">Auto convert</span>
                  <Switch bind:checked={auto_convert} />
                </Label>
              </div>
            </div>
            <div class="relative">
              <Textarea
                id="output-text"
                class={'field-sizing-fixed min-h-[200px] resize-none overflow-auto bg-muted/30 pb-8 text-base sm:min-h-[240px] md:min-h-[280px] md:text-base lg:min-h-[320px] xl:min-h-[360px] ' +
                  getFontClass(to_script)}
                placeholder="The transliteration appears here"
                value={outputText}
                readonly
              />
              <div
                class="pointer-events-none absolute right-3 bottom-2 left-3 text-xs text-muted-foreground"
              >
                {formatWords(countWords(outputText))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <CustomOptions {availableOptions} bind:options>
        {#snippet presetSelector()}
          <PresetSelector bind:preset={current_preset} />
        {/snippet}
      </CustomOptions>
    </form>
    {@render pwa_snippet?.()}
  </div>

  {#if typing_modal_open && typing_script !== 'Normal'}
    {#await import('./TypingHelper.svelte') then { default: TypingHelper }}
      <TypingHelper bind:open={typing_modal_open} script={typing_script} />
    {/await}
  {/if}
</div>

{#snippet swap_button()}
  <Button
    type="button"
    variant="outline"
    size="icon"
    aria-label="Swap scripts"
    title="Swap scripts and text"
    onclick={handleSwap}
    class="size-9 rounded-full bg-card shadow-sm transition-transform hover:rotate-180"
  >
    <ArrowLeftRight class="size-4" />
  </Button>
{/snippet}
