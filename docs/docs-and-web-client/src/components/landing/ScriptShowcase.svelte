<script lang="ts">
  import { transliterate, type ScriptListType } from 'lipilekhika';
  import { input_text_atom, typing_script_atom } from '$components/script/state';
  import { getFontClass } from '$components/script/font_list';
  import { getScriptAvatar } from '$components/script/script_avatar';

  /** Shown until something is typed in the hero box */
  const SAMPLE_TEXT = 'लिपि लेखिका';
  const SAMPLE_SCRIPT: ScriptListType = 'Devanagari';
  /** Keep the cards compact for long inputs */
  const MAX_INPUT_LENGTH = 160;

  const SCRIPTS: { script: ScriptListType; native?: string }[] = [
    { script: 'Devanagari', native: 'देवनागरी' },
    { script: 'Telugu', native: 'తెలుగు' },
    { script: 'Tamil', native: 'தமிழ்' },
    { script: 'Bengali', native: 'বাংলা' },
    { script: 'Assamese', native: 'অসমীয়া' },
    { script: 'Kannada', native: 'ಕನ್ನಡ' },
    { script: 'Gujarati', native: 'ગુજરાતી' },
    { script: 'Malayalam', native: 'മലയാളം' },
    { script: 'Gurumukhi', native: 'ਗੁਰਮੁਖੀ' },
    { script: 'Odia', native: 'ଓଡ଼ିଆ' },
    { script: 'Sinhala', native: 'සිංහල' },
    { script: 'Tamil-Extended' }
  ];
  const ROMAN_SCHEMES: ScriptListType[] = ['Romanized', 'IAST', 'ITRANS', 'Harvard-Kyoto', 'SLP1'];
  const ANCIENT_SCRIPTS: ScriptListType[] = ['Brahmi', 'Granth', 'Modi', 'Sharada', 'Siddham'];
  const ALL_SCRIPTS = [...SCRIPTS.map((s) => s.script), ...ROMAN_SCHEMES, ...ANCIENT_SCRIPTS];

  let outputs = $state<Partial<Record<ScriptListType, string>>>({});
  let run_id = 0;

  const has_input = $derived($input_text_atom.trim().length > 0);

  $effect(() => {
    const text = has_input ? $input_text_atom.slice(0, MAX_INPUT_LENGTH) : SAMPLE_TEXT;
    const from = has_input ? $typing_script_atom : SAMPLE_SCRIPT;
    const current_run = ++run_id;
    Promise.all(
      ALL_SCRIPTS.map((to) =>
        transliterate(text, from, to).then(
          (result) => [to, result] as const,
          () => [to, ''] as const
        )
      )
    ).then((results) => {
      // drop results of older inputs that finished late
      if (current_run === run_id) outputs = Object.fromEntries(results);
    });
  });

  /** Continue typing in the picked script, carrying the current text over */
  const pickScript = (script: ScriptListType) => {
    if (has_input) input_text_atom.set(outputs[script] ?? '');
    typing_script_atom.set(script);
    const target = document.getElementById('try');
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target?.querySelector('textarea')?.focus({ preventScroll: true });
  };
</script>

<div class="mb-8 text-center sm:mb-10">
  <h2 class="text-2xl font-bold tracking-tight sm:text-3xl">One text, every script</h2>
  <p class="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
    {#if has_input}
      What you typed above, in every supported script. Pick one to continue typing in it.
    {:else}
      Type something above and watch it appear in every supported script — modern and ancient.
    {/if}
  </p>
</div>

<div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
  {#each SCRIPTS as { script, native } (script)}
    {@render card(script, native)}
  {/each}
</div>
{@render group('Romanization schemes', ROMAN_SCHEMES)}
{@render group('Ancient scripts', ANCIENT_SCRIPTS)}
<p class="mt-6 text-center text-xs text-muted-foreground">
  Also supported: Purna-Devanagari and the Normal (English letters) input scheme.
</p>

{#snippet group(title: string, scripts: ScriptListType[])}
  <div
    class="mt-8 mb-4 flex items-center gap-3 text-xs font-medium tracking-wide text-muted-foreground uppercase"
  >
    <span class="h-px flex-1 bg-border/60"></span>
    {title}
    <span class="h-px flex-1 bg-border/60"></span>
  </div>
  <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
    {#each scripts as script (script)}
      {@render card(script)}
    {/each}
  </div>
{/snippet}

{#snippet card(script: ScriptListType, native?: string)}
  {@const is_current = has_input && script === $typing_script_atom}
  <button
    type="button"
    onclick={() => pickScript(script)}
    title={`Type in ${script}`}
    class={'group flex min-h-28 flex-col rounded-xl border bg-card/60 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:p-4 ' +
      (is_current ? 'border-primary/50 ring-1 ring-primary/30' : 'border-border/60')}
  >
    <span class="flex items-center gap-2">
      <span
        class={'inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-muted px-1 text-xs text-foreground/80 ' +
          getFontClass(script)}>{getScriptAvatar(script)}</span
      >
      <span class="truncate text-xs font-medium text-muted-foreground">{script}</span>
      {#if native}
        <span class={'ml-auto truncate text-xs text-muted-foreground/70 ' + getFontClass(script)}
          >{native}</span
        >
      {/if}
    </span>
    <span
      class={'mt-3 line-clamp-3 text-lg leading-relaxed break-words text-foreground sm:text-xl ' +
        getFontClass(script)}
    >
      {outputs[script] ?? ' '}
    </span>
  </button>
{/snippet}
