<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import {
    transliterate,
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
  import prettyMs from 'pretty-ms';

  import { Button } from '~/lib/components/ui/button';
  import { Switch } from '~/lib/components/ui/switch';
  import { Textarea } from '~/lib/components/ui/textarea';
  import { Separator } from '~/lib/components/ui/separator';
  import * as Popover from '~/lib/components/ui/popover';
  import { KeyboardIcon, SettingsIcon } from 'lucide-svelte';
  import { Icon } from 'svelte-icons-pack';
  import { BiHelpCircle } from 'svelte-icons-pack/bi';
  import { BsCopy } from 'svelte-icons-pack/bs';
  import { input_text_atom, typing_script_atom } from '$components/script/state';
  import ScriptSeleector from './script/ScriptSelector.svelte';
  import CustomOptions from './script/CustomOptions.svelte';
  import { SiConvertio } from 'svelte-icons-pack/si';
  import Label from '~/lib/components/ui/label/label.svelte';
  import PWAInstall from './PWAInstall.svelte';

  const DEFAULT_TO: ScriptListType = 'Romanized';

  let toScript = $state<ScriptListType>(DEFAULT_TO);
  let outputText = $state('');
  let options = $state<TransliterationOptions>({});
  let availableOptions = $state<string[]>([]);
  let conversionTime = $state<string>('');
  let timeoutId: NodeJS.Timeout | undefined;

  let typing_enabled = $state(true);
  let useNativeNumerals = $state(DEFAULT_USE_NATIVE_NUMERALS);
  let includeInherentVowel = $state(DEFAULT_INCLUDE_INHERENT_VOWEL);

  let from_input_typing_context = $derived(createTypingContext($typing_script_atom));

  let typing_modal_open = $state(false);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    try {
      const startTime = performance.now();
      const result = await transliterate($input_text_atom, $typing_script_atom, toScript, options);
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
    const currentFrom = $typing_script_atom;
    const currentTo = toScript;
    const currentInputText = $input_text_atom;
    const currentOutputText = outputText;
    $typing_script_atom = currentTo;
    toScript = currentFrom;
    $input_text_atom = currentOutputText;
    outputText = currentInputText;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  $effect(() => {
    getAllOptions($typing_script_atom, toScript).then((all_options) => {
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
    const prom = [preloadScriptData($typing_script_atom), preloadScriptData(toScript)];
    Promise.allSettled(prom).then(() => {
      handleSubmit(new SubmitEvent('submit'));
    });
  });

  $effect(() => {
    toScript;
    $state.snapshot(options);
    // on change of any of the above, re-run the handleSubmit
    untrack(() => {
      handleSubmit(new SubmitEvent('submit'));
    });
  });

  let auto_convert = $state(true);

  $effect(() => {
    $input_text_atom;
    untrack(() => {
      if (auto_convert) {
        handleSubmit(new SubmitEvent('submit'));
      }
    });
  });
</script>

<div class="mt-12 flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-4 pt-4">
  <div class="mx-auto w-full max-w-6xl px-0 sm:px-6">
    <form
      class="space-y-8 rounded-xl border border-border bg-card p-6 shadow-2xl sm:p-8"
      onsubmit={handleSubmit}
    >
      <!-- From / To Sections -->
      <div class="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <!-- From Section -->
        <section class="flex flex-col gap-5">
          <div class="flex items-center justify-between gap-4">
            <div class="flex flex-col gap-2.5">
              <span class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                >From</span
              >
              <ScriptSeleector bind:script={$typing_script_atom} />
            </div>
            <div class="hidden items-center justify-center lg:flex">
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
          </div>

          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <label
                  for="source-text"
                  class="text-sm font-medium tracking-wide text-muted-foreground"
                >
                  Source text
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-8"
                  onclick={() => copyToClipboard($input_text_atom)}
                  title="Copy source text"
                >
                  <Icon src={BsCopy} className="size-4" />
                  <span class="sr-only">Copy source text</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-8"
                  onclick={() => (typing_modal_open = true)}
                >
                  <Icon src={BiHelpCircle} className="size-6 fill-sky-500 dark:fill-sky-400" />
                  <span class="sr-only">Typing Help</span>
                </Button>
              </div>
              <div class="flex items-center gap-2">
                <span class="hidden text-xs text-muted-foreground sm:inline-block"
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
              class={'field-sizing-fixed min-h-[200px] resize-none overflow-auto sm:min-h-[240px] md:min-h-[280px] lg:min-h-[320px] xl:min-h-[360px] ' +
                getFontClass($typing_script_atom)}
              placeholder="Enter text to transliterate..."
              bind:value={$input_text_atom}
              onbeforeinput={(e) =>
                handleTypingBeforeInputEvent(
                  from_input_typing_context,
                  e,
                  (new_value) => ($input_text_atom = new_value),
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
        </section>

        <!-- To Section -->
        <section class="flex flex-col gap-5">
          <div class="flex items-center justify-between gap-4">
            <div class="flex w-full flex-col gap-2.5">
              <span class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                >To</span
              >
              <ScriptSeleector bind:script={toScript} />
            </div>
            <div class="flex items-center justify-center lg:hidden">
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
          </div>

          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <label
                  for="output-text"
                  class="text-sm font-medium tracking-wide text-muted-foreground sm:block"
                >
                  Output
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-8"
                  onclick={() => copyToClipboard(outputText)}
                  title="Copy output text"
                >
                  <Icon src={BsCopy} className="size-4" />
                  <span class="sr-only">Copy output text</span>
                </Button>
              </div>
              <Label>
                <span class="text-sm font-medium tracking-wide text-muted-foreground">Auto </span>
                <Switch bind:checked={auto_convert} />
              </Label>
              {#if !auto_convert}
                <Button type="submit" size="sm" variant="ghost" class="gap-1.5 font-semibold">
                  <Icon src={SiConvertio} className="size-4" />
                  Convert
                </Button>
              {/if}
            </div>
            <Textarea
              id="output-text"
              class={'field-sizing-fixed min-h-[200px] resize-none overflow-auto bg-muted/30 sm:min-h-[240px] md:min-h-[280px] lg:min-h-[320px] xl:min-h-[360px] ' +
                getFontClass(toScript)}
              value={outputText}
              readonly
            />
          </div>
        </section>
      </div>

      <CustomOptions {availableOptions} bind:options />
    </form>
    <div class="mt-8">
      <PWAInstall />
    </div>
  </div>

  {#if typing_modal_open}
    {#await import('./TypingHelper.svelte') then { default: TypingHelper }}
      <TypingHelper bind:open={typing_modal_open} script={$typing_script_atom} />
    {/await}
  {/if}
</div>
