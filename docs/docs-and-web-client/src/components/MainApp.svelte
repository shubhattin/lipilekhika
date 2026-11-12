<script lang="ts">
  import { onMount, tick, untrack, type Snippet } from 'svelte';
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
  import { Toggle } from '~/lib/components/ui/toggle';
  import { cn } from '~/lib/utils.js';
  import { Separator } from '~/lib/components/ui/separator';
  import * as Popover from '~/lib/components/ui/popover';
  import {
    ArrowLeftRight,
    Download,
    FolderOpen,
    KeyboardIcon,
    KeyboardOffIcon,
    SettingsIcon,
    Undo2,
    X
  } from 'lucide-svelte';
  import { Icon } from 'svelte-icons-pack';
  import CopyButton from './CopyButton.svelte';
  import {
    downloadTextFile,
    isFileDrag,
    readTextFile,
    textFileName,
    TextFileError,
    TEXT_FILE_ACCEPT
  } from './app/text_file';
  import { loadSavedText, saveText, type SaveResult } from './app/saved_text';
  import TextBoxMenu from './app/TextBoxMenu.svelte';
  import { editKindOf, TextHistory, type TextSnapshot } from './app/text_history';
  import TypingHelpButton from './typing_help/TypingHelpButton.svelte';
  import TypingOptionChips from './typing_help/TypingOptionChips.svelte';
  import { PILL_TOGGLE } from './typing_help/pill';
  import {
    getTypingOptionExamples,
    type TypingOptionExamples
  } from './typing_help/option_examples';
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
    transliterate_func,
    current_preset = $bindable('none'),
    useNativeNumerals = $bindable(DEFAULT_USE_NATIVE_NUMERALS),
    includeInherentVowel = $bindable(DEFAULT_INCLUDE_INHERENT_VOWEL)
  }: {
    input_text: string;
    typing_script: ScriptListType;
    to_script: ScriptListType;
    pwa_snippet?: Snippet;
    transliterate_func: typeof transliterate;
    current_preset?: PresetListType;
    useNativeNumerals: boolean;
    includeInherentVowel: boolean;
  } = $props();

  let source_textarea = $state<HTMLTextAreaElement | null>(null);

  /**
   * The text that Clear or an opened file replaced, so a slip can be taken back. It stays
   * on offer until the box changes again (typing after a Clear means the old text is gone
   * on purpose).
   */
  let replaced = $state<{ text: string; by: 'clear' | 'open'; after: string } | null>(null);
  const can_undo = $derived(replaced !== null && replaced.after === input_text);

  // Undo/redo for the source box (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y): see text_history.ts
  const text_history = new TextHistory();
  const snapshot = (): TextSnapshot => ({
    text: input_text,
    start: source_textarea?.selectionStart ?? input_text.length,
    end: source_textarea?.selectionEnd ?? input_text.length
  });
  const applySnapshot = async (s: TextSnapshot) => {
    from_input_typing_context.clearContext();
    input_text = s.text;
    source_textarea?.focus();
    // the caret goes back where it was, once the binding has put the text in the box
    await tick();
    source_textarea?.setSelectionRange(s.start, s.end);
  };
  const undoText = () => {
    const prev = text_history.undo(snapshot());
    if (prev) applySnapshot(prev);
  };
  const redoText = () => {
    const next = text_history.redo(snapshot());
    if (next) applySnapshot(next);
  };

  /** A change made in code (Clear, an opened file): an undo step of its own */
  const setInputText = (text: string) => {
    if (text === input_text) return;
    text_history.record(snapshot(), 'other');
    from_input_typing_context.clearContext();
    input_text = text;
  };

  const replaceInput = (text: string, by: 'clear' | 'open') => {
    if (input_text && input_text !== text) replaced = { text: input_text, by, after: text };
    setInputText(text);
  };

  /** the Undo clear / Undo open button: the same undo as Ctrl+Z */
  const undoReplace = () => {
    if (!can_undo) return;
    replaced = null;
    undoText();
  };

  const clearInput = () => {
    replaceInput('', 'clear');
    // the saved copy goes now, not after the delay: Clear is how people remove it
    saveNow();
    source_textarea?.focus();
  };

  // The source text is kept in this browser, a moment after typing stops, and comes back on
  // the next visit. Saving waits until the saved text has been checked on mount, so the empty
  // box at load doesn't overwrite it.
  const SAVE_DELAY_MS = 500;
  let save_ready = false;
  let save_timeout: ReturnType<typeof setTimeout> | undefined;
  /** what storage holds, as far as we know (`null`: unknown, or nothing could be saved) */
  let saved_text: string | null = null;
  let save_status = $state<SaveResult>('saved');
  /** the text brought back on load, for the note under the box until it is edited */
  let restored_text = $state<string | null>(null);

  const saveNow = () => {
    if (!save_ready) return;
    clearTimeout(save_timeout);
    save_timeout = undefined;
    const text = input_text;
    save_status = saveText(text);
    saved_text = save_status === 'saved' ? text : null;
  };
  /** a pending save is written right away (the page is being hidden or left) */
  const flushSave = () => {
    if (save_timeout !== undefined) saveNow();
  };

  onMount(() => {
    const saved = loadSavedText();
    save_ready = true;
    // text already in the box came from this visit (another page of the site), so it is newer
    if (!input_text && saved) {
      input_text = saved;
      restored_text = saved;
      saved_text = saved;
    } else if (input_text !== (saved ?? '')) saveNow();
    else saved_text = input_text;
  });

  $effect(() => {
    input_text;
    untrack(() => {
      if (!save_ready || input_text === saved_text) return;
      clearTimeout(save_timeout);
      save_timeout = setTimeout(saveNow, SAVE_DELAY_MS);
    });
  });

  // Saving a box as .txt: from its ⋯ menu, or Ctrl/Cmd+S while the box has focus (in place of
  // the browser's "save page", which is never what is wanted here)
  const saveSourceFile = () => {
    if (input_text) downloadTextFile(input_text, textFileName('source', typing_script));
  };
  const saveOutputFile = () => {
    if (outputText) downloadTextFile(outputText, textFileName('output', to_script));
  };
  const isSaveShortcut = (e: KeyboardEvent) =>
    (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's';
  // what the shortcut is called here; the page is prerendered, so Apple is checked on mount
  let save_shortcut = $state('Ctrl+S');
  onMount(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) save_shortcut = '⌘S';
  });

  // Opening a .txt file into the source box, from its ⋯ menu, the Open button on an empty
  // box, or dropped on the box
  let file_drag_over = $state(false);
  let file_input = $state<HTMLInputElement | null>(null);
  let file_error = $state<string | null>(null);
  let file_error_timeout: ReturnType<typeof setTimeout> | undefined;

  const openTextFile = async (file: File) => {
    clearTimeout(file_error_timeout);
    file_error = null;
    try {
      replaceInput(await readTextFile(file), 'open');
    } catch (err) {
      if (!(err instanceof TextFileError)) console.error(err);
      file_error = err instanceof TextFileError ? err.message : `Couldn't read ${file.name}`;
      file_error_timeout = setTimeout(() => (file_error = null), 6000);
    }
  };

  let outputText = $state('');
  let options = $state<TransliterationOptions>({});
  let availableOptions = $state<string[]>([]);
  // let conversionTime = $state<string>('');
  let timeoutId: NodeJS.Timeout | undefined;

  let typing_enabled = $state(true);

  let from_input_typing_context = $derived(createTypingContext(typing_script));

  let typing_modal_open = $state(false);

  // live examples of the typing options in the current script, for the settings popover
  let option_examples = $state<TypingOptionExamples | null>(null);
  $effect(() => {
    const for_script = typing_script;
    getTypingOptionExamples(for_script)
      .then((e) => {
        if (for_script === typing_script) option_examples = e;
      })
      .catch(() => (option_examples = null));
  });
  // the quick toggles under the text, only where the options do something
  const show_option_chips = $derived(
    typing_enabled &&
      typing_script !== 'Normal' &&
      !!(option_examples?.vowel || option_examples?.numerals)
  );

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
    // the old steps are text in the other script now; Swap again is the undo for a swap
    text_history.clear();
    from_input_typing_context.clearContext();
    input_text = currentOutputText;
    outputText = currentInputText;
  };

  // Set when the user toggles an option by hand: the preset drops to 'none' but the
  // options they picked must stay, so the next preset application is skipped once.
  let keepOptionsOnNextApply = false;
  // Only the latest `getAllOptions` call may write, so a slow earlier one can't win a race.
  let applyRun = 0;

  // Apply preset options when preset changes or scripts change
  $effect(() => {
    const _currentPreset = current_preset;
    const _typingScript = typing_script;
    const _toScript = to_script;
    const run = ++applyRun;

    getAllOptions(_typingScript, _toScript).then((all_options) => {
      if (run !== applyRun) return;
      untrack(() => {
        availableOptions = all_options;

        if (keepOptionsOnNextApply) {
          keepOptionsOnNextApply = false;
          return;
        }

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
      });
    });
  });

  // A hand-toggled option no longer matches the preset, so drop it to 'none'
  const handleManualOptionChange = () => {
    if (current_preset === 'none') return;
    keepOptionsOnNextApply = true;
    current_preset = 'none';
  };

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

<!-- A pending save is written as soon as the page is hidden: a phone may discard a hidden
     tab without any unload event. -->
<svelte:document onvisibilitychange={() => document.visibilityState === 'hidden' && flushSave()} />
<!-- A file dropped outside the source box would open in the tab in place of the app.
     Leaving the page (reload, closing the tab, back to another site, a link to a page
     outside the client router) only asks first when the text couldn't be saved (too long,
     or storage blocked), and never in dev; saved text comes back on the next visit. Moves between pages of
     the site keep it anyway: it lives in a shared store. -->
<svelte:window
  onbeforeunload={(e) => {
    flushSave();
    // nothing to lose when the text is saved; ask only when it couldn't be. Never in local
    // dev: the prompt gets in the way of the dev server's own reloads.
    if (import.meta.env.DEV || !input_text.trim() || saved_text === input_text) return;
    e.preventDefault();
    // older browsers only ask when returnValue is set
    e.returnValue = '';
  }}
  onpagehide={flushSave}
  ondragover={(e) => isFileDrag(e) && e.preventDefault()}
  ondrop={(e) => isFileDrag(e) && e.preventDefault()}
/>

<!-- Anchored to the top, not centred: the platform banner below the card only appears
     after load (it needs the user agent), and centring would push the card up when it does -->
<div class="mt-12 flex min-h-[90vh] flex-col items-center overflow-hidden px-4 pt-4 sm:pt-6">
  <div class="mx-auto w-full max-w-page px-0 sm:px-6">
    <form
      class="space-y-6 rounded-2xl border border-border bg-card p-4 shadow-2xl shadow-black/5 sm:space-y-8 sm:p-8 dark:shadow-black/30"
      onsubmit={handleSubmit}
    >
      <!-- From / To Sections. The text boxes grow with the screen height (--text-box-h):
           stacked, each takes about half of it; side by side on large screens, they fill
           what the header, the rows around them and the platform banner under the card leave,
           so all of it fits on screen with a little room to spare. -->
      <div
        class="relative grid gap-6 [--text-box-h:clamp(200px,calc(50dvh-90px),480px)] lg:grid-cols-2 lg:gap-14 lg:[--text-box-h:clamp(300px,calc(100dvh-500px),900px)]"
      >
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
            <!-- The typing guide sits by the script it is about, where the selector leaves room
                 (the row under it has none on a phone). Its label goes with the row's width:
                 "How to type" ≥ 20rem, "Help" ≥ 17.5rem, otherwise just the icon. -->
            <div class="@container/script">
              <div class="flex items-center gap-3">
                <ScriptSeleector bind:script={typing_script} />
                {#if typing_script !== 'Normal'}
                  <TypingHelpButton
                    labels={{
                      short: 'hidden @[17.5rem]/script:inline @[20rem]/script:hidden',
                      full: 'hidden @[20rem]/script:inline',
                      padded: '@[17.5rem]/script:px-2.5'
                    }}
                    onclick={() => (typing_modal_open = true)}
                  />
                {/if}
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <!-- Labels come and go with the row's own width (it is half the page on large
                 screens): "Source text" ≥ 17.5rem, the Alt+X hint ≥ 20rem (not on
                 touch screens, which have no Alt key), "Typing" on its
                 toggle ≥ 13rem. Measured to fit, keep in step if the row changes. -->
            <div class="@container">
              <div class="flex min-h-8 items-center justify-between gap-2">
                <div class="flex items-center gap-1">
                  <label
                    for="source-text"
                    class="mr-1 text-sm font-medium tracking-wide whitespace-nowrap text-muted-foreground"
                  >
                    Source<span class="hidden @[17.5rem]:inline">&nbsp;text</span>
                  </label>
                  <CopyButton text={() => input_text} label="Copy source text" />
                  <!-- Save sits beside Copy where there is room (md and up); a phone gets a ⋯ menu
                       with Open and Save instead, to keep the row short -->
                  {@render save_button(
                    'Save source as .txt',
                    !input_text,
                    saveSourceFile,
                    'hidden md:inline-flex'
                  )}
                  <TextBoxMenu
                    class="md:hidden"
                    label="More actions for the source text"
                    items={[
                      {
                        label: 'Open .txt file…',
                        icon: FolderOpen,
                        onclick: () => file_input?.click()
                      },
                      {
                        label: 'Save as .txt',
                        icon: Download,
                        onclick: saveSourceFile,
                        disabled: !input_text,
                        shortcut: save_shortcut
                      }
                    ]}
                    hint="You can also drop a .txt file on the box"
                  />
                </div>
                <div class="flex items-center gap-1">
                  <Toggle
                    bind:pressed={typing_enabled}
                    class={cn(PILL_TOGGLE, 'h-7 gap-1.5 px-2.5')}
                    aria-label="Realtime typing"
                    title={typing_enabled
                      ? 'Realtime typing is on: English keys type in the script. Click or Alt+X to turn off'
                      : 'Realtime typing is off: keys type as they are. Click or Alt+X to turn on'}
                  >
                    {#if typing_enabled}
                      <KeyboardIcon class="size-3.5" />
                    {:else}
                      <KeyboardOffIcon class="size-3.5" />
                    {/if}
                    <span class="hidden @[13rem]:inline">Typing</span>
                    <kbd
                      class="hidden rounded border border-current/20 px-1 font-mono text-[0.6rem] leading-4 opacity-70 @[20rem]:not-pointer-coarse:inline"
                      >Alt+X</kbd
                    >
                  </Toggle>
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
                                >Convert numbers to script numerals{#if option_examples?.numerals}
                                  <span class="whitespace-nowrap"
                                    >(1 → <span class={getFontClass(typing_script)}
                                      >{option_examples.numerals.on}</span
                                    >)</span
                                  >{/if}</span
                              >
                            </label>
                            <Switch id="use-native-numerals" bind:checked={useNativeNumerals} />
                          </div>
                          <Separator />
                          <div class="flex items-center justify-between gap-4">
                            <label for="include-inherent-vowel" class="flex flex-col gap-1 text-sm">
                              <span class="font-medium">Include Inherent Vowel</span>
                              <span class="text-xs text-muted-foreground"
                                >Add inherent vowel (schwa) to consonants{#if option_examples?.vowel}
                                  <span class="whitespace-nowrap"
                                    >(k → <span class={getFontClass(typing_script)}
                                      >{option_examples.vowel.on}</span
                                    >
                                    instead of
                                    <span class={getFontClass(typing_script)}
                                      >{option_examples.vowel.off}</span
                                    >)</span
                                  >{/if}</span
                              >
                            </label>
                            <Switch
                              id="include-inherent-vowel"
                              bind:checked={includeInherentVowel}
                            />
                          </div>
                        </div>
                        {#if option_examples?.vowel || option_examples?.numerals}
                          <p class="border-t pt-3 text-xs text-muted-foreground">
                            Quick toggles for both sit at the bottom of the text box.
                          </p>
                        {/if}
                      </div>
                    </Popover.Content>
                  </Popover.Root>
                </div>
              </div>
            </div>
            <!-- The box draws the border, so the pills and Clear get a strip of their own under
                 the text instead of floating over it. -->
            <!-- A .txt file dropped here opens in it (dropped anywhere else, the window ignores it) -->
            <div
              class={cn(
                'relative flex h-(--text-box-h) flex-col rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30',
                file_drag_over && 'border-primary ring-[3px] ring-primary/30'
              )}
              role="group"
              aria-label="Source text box"
              ondragover={(e) => {
                if (!isFileDrag(e)) return;
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
                file_drag_over = true;
              }}
              ondragleave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                  file_drag_over = false;
              }}
              ondrop={(e) => {
                if (!isFileDrag(e)) return;
                e.preventDefault();
                file_drag_over = false;
                const file = e.dataTransfer?.files[0];
                if (file) openTextFile(file);
              }}
            >
              {#if file_drag_over}
                <div
                  class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/85 text-sm font-medium text-foreground"
                >
                  Drop a .txt file to open it here
                </div>
              {/if}
              <Textarea
                id="source-text"
                bind:ref={source_textarea}
                autocomplete="off"
                spellcheck="false"
                autocapitalize="none"
                class={'field-sizing-fixed min-h-0 flex-1 resize-none overflow-auto border-0 bg-transparent text-base shadow-none focus-visible:ring-0 md:text-base dark:bg-transparent ' +
                  getFontClass(typing_script)}
                placeholder={typing_enabled && typing_script !== 'Normal'
                  ? `Type with English letters to write in ${typing_script}…`
                  : 'Enter text to transliterate…'}
                bind:value={input_text}
                onbeforeinput={(e) => {
                  // the browser's own undo (Edit menu, iOS shake) goes to ours, which knows
                  // the typed text
                  if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') {
                    e.preventDefault();
                    if (e.inputType === 'historyUndo') undoText();
                    else redoText();
                    return;
                  }
                  // a composed word (phone keyboards, IMEs) is recorded once, as it starts
                  if (!e.isComposing)
                    text_history.record(snapshot(), editKindOf(e.inputType), e.data);
                  handleTypingBeforeInputEvent(
                    from_input_typing_context,
                    e,
                    (new_value) => (input_text = new_value),
                    typing_enabled
                  );
                }}
                oncompositionstart={() => text_history.record(snapshot(), 'type')}
                onblur={() => from_input_typing_context.clearContext()}
                onkeydown={(e) => {
                  if (isSaveShortcut(e)) {
                    e.preventDefault();
                    saveSourceFile();
                    return;
                  }
                  // undo (Ctrl/Cmd+Z) and redo (Ctrl/Cmd+Shift+Z, Ctrl+Y)
                  const key = e.key.toLowerCase();
                  if ((e.ctrlKey || e.metaKey) && !e.altKey && (key === 'z' || key === 'y')) {
                    e.preventDefault();
                    if (key === 'z' && !e.shiftKey) undoText();
                    else redoText();
                    return;
                  }
                  // Toggle typing on Alt+X
                  if (e.altKey && (e.key === 'x' || e.key === 'X')) {
                    e.preventDefault();
                    typing_enabled = !typing_enabled;
                    return;
                  }
                  clearTypingContextOnKeyDown(e, from_input_typing_context);
                }}
              />
              <!-- Always there, for Open .txt: on md and up always, on a phone only while the box
                   is empty (it is also in the ⋯ menu there). Labels shorten on narrow boxes while Undo shows: "Undo clear" and "Clear" in
                   full ≥ 17rem (otherwise "Clear" ≥ 15rem). -->
              <div class="@container/strip">
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                  class="flex min-h-9 cursor-text items-center gap-2 px-2 pb-2"
                  onmousedown={(e) => {
                    // the strip is part of the box: a click on its empty part goes to the text
                    if (e.target === e.currentTarget) {
                      e.preventDefault();
                      source_textarea?.focus();
                    }
                  }}
                >
                  {#if show_option_chips}
                    <TypingOptionChips
                      script={typing_script}
                      bind:useNativeNumerals
                      bind:includeInherentVowel
                    />
                  {/if}
                  <div class="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      class={cn(
                        'shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
                        !input_text && !can_undo ? 'inline-flex' : 'hidden md:inline-flex'
                      )}
                      onclick={() => file_input?.click()}
                      title="Open a .txt file (or drop one on the box)"
                    >
                      <FolderOpen class="size-3.5" />
                      Open .txt
                    </button>
                    {#if can_undo && replaced}
                      <button
                        type="button"
                        class="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-primary transition-colors hover:bg-primary/10"
                        onclick={undoReplace}
                        title={replaced.by === 'clear'
                          ? 'Bring back the cleared text (Ctrl+Z)'
                          : 'Go back to the text before the file was opened (Ctrl+Z)'}
                      >
                        <Undo2 class="size-3.5" />
                        Undo<span class="hidden @[17rem]/strip:inline"
                          >{replaced.by === 'clear' ? 'clear' : 'open'}</span
                        >
                      </button>
                    {/if}
                    {#if input_text}
                      <button
                        type="button"
                        class="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                        onclick={clearInput}
                        title="Clear source text (and the copy kept in this browser)"
                      >
                        <X class="size-3.5" />
                        <span
                          class={can_undo
                            ? 'hidden @[17rem]/strip:inline'
                            : 'hidden @[15rem]/strip:inline'}>Clear</span
                        >
                        <span
                          class={can_undo
                            ? 'sr-only @[17rem]/strip:hidden'
                            : 'sr-only @[15rem]/strip:hidden'}>Clear source text</span
                        >
                      </button>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
            <input
              bind:this={file_input}
              type="file"
              accept={TEXT_FILE_ACCEPT}
              class="hidden"
              onchange={(e) => {
                const file = e.currentTarget.files?.[0];
                // reset, so picking the same file again still fires `change`
                e.currentTarget.value = '';
                if (file) openTextFile(file);
              }}
            />
            {#if file_error}
              <p role="alert" class="px-1 text-xs text-destructive">{file_error}</p>
            {/if}
            {#if restored_text !== null && input_text === restored_text}
              <p class="px-1 text-xs text-muted-foreground">
                Your text from last time. It's kept in this browser until you clear it.
              </p>
            {:else if save_status === 'too_large' && input_text}
              <p class="px-1 text-xs text-muted-foreground">
                This text is too long to keep in this browser, so it won't be here next time. Save
                it as .txt to keep it.
              </p>
            {/if}
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
              {@render save_button('Save output as .txt', !outputText, saveOutputFile)}
              <div class="ml-auto flex items-center gap-2">
                {#if !auto_convert}
                  <Button
                    type="submit"
                    size="sm"
                    variant="secondary"
                    class="h-8 gap-1.5 font-semibold"
                  >
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
            <Textarea
              id="output-text"
              class={'field-sizing-fixed h-(--text-box-h) min-h-0 resize-none overflow-auto bg-muted/30 text-base md:text-base ' +
                getFontClass(to_script)}
              placeholder="The transliteration appears here"
              value={outputText}
              readonly
              onkeydown={(e) => {
                if (!isSaveShortcut(e)) return;
                e.preventDefault();
                saveOutputFile();
              }}
            />
          </div>
        </section>
      </div>

      <CustomOptions {availableOptions} bind:options onManualChange={handleManualOptionChange}>
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

{#snippet save_button(title: string, disabled: boolean, onclick: () => void, extra_class = '')}
  <Button
    variant="ghost"
    size="icon"
    class={cn('size-8', extra_class)}
    title={`${title} (${save_shortcut})`}
    {disabled}
    {onclick}
  >
    <Download class="size-4" />
    <span class="sr-only">{title}</span>
  </Button>
{/snippet}

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
