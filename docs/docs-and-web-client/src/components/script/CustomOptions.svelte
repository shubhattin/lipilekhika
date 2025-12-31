<script lang="ts">
  import Switch from '$lib/components/ui/switch/switch.svelte';
  import { slide } from 'svelte/transition';
  import type { TransliterationOptions } from 'lipilekhika';
  import { InfoIcon } from 'lucide-svelte';
  import * as Popover from '$lib/components/ui/popover';
  import Button from '$lib/components/ui/button/button.svelte';

  let {
    availableOptions,
    options = $bindable()
  }: {
    availableOptions: string[];
    options: TransliterationOptions;
  } = $props();

  let showOptions = $state(false);

  type CustomOptionList = keyof TransliterationOptions;

  const CUSTOM_OPTION_DESCRIPTION: Record<CustomOptionList, [name: string, description: string]> = {
    'all_to_normal:preserve_specific_chars': [
      'Preserve Specific Characters',
      'Preserves script-specific characters when converting to Normal script. Can be useful for studying script specific characters.'
    ],
    'all_to_normal:remove_virAma_and_double_virAma': [
      'Remove Virāma and Double Virāma',
      'Removes virāma (।) and pūrṇa virāma (॥) punctuation from Normal/Romanized output.'
    ],
    'all_to_normal:replace_avagraha_with_a': [
      'Replace Avagraha with a',
      "Replaces avagraha (ऽ) with 'a' in Normal/Romanized output."
    ],
    'all_to_sinhala:use_conjunct_enabling_halant': [
      'Use Conjunct Enabling Halant',
      'Uses conjunct-enabling halant (්‍) for Sinhala output to properly form conjunct consonants.'
    ],
    'all_to_normal:replace_pancham_varga_varna_with_n': [
      'Replace Pancham Varga Varna with n',
      "Replaces ङ (G) and ञ (J) with 'n' for more natural output."
    ],
    'brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra': [
      'Replace Pancham Varga Varna with Anusvāra',
      'Replaces 5th varga consonants (ङ्, ञ्, ण्, न्, म्) with anusvāra (ं) when followed by consonants of the same varga.'
    ],
    'normal_to_all:use_typing_chars': [
      'Use Typing Characters',
      'Enables typing mode characters including duplicate alternatives and script-specific characters. Equivalent to typing mode using `createTypingContext` function.'
    ]
  };
</script>

<!-- Options Section -->
<div class="rounded-lg border border-border bg-card/50">
  <button
    type="button"
    class="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-accent/50"
    onclick={() => (showOptions = !showOptions)}
  >
    <span class="text-sm font-medium tracking-wide text-foreground"> Transliteration Options </span>
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
        <p class="text-sm text-muted-foreground">No options available for this combination.</p>
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
                  {CUSTOM_OPTION_DESCRIPTION[option as CustomOptionList]?.[0] ?? option}
                </span>
                <Popover.Root>
                  <Popover.Trigger>
                    <Button variant="ghost" class="size-5">
                      <InfoIcon class="size-4" />
                    </Button>
                  </Popover.Trigger>
                  <Popover.Content class="w-80">
                    <p class="text-sm">
                      {CUSTOM_OPTION_DESCRIPTION[option as CustomOptionList]?.[1] ??
                        'No description available.'}
                    </p>
                  </Popover.Content>
                </Popover.Root>
              </label>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
