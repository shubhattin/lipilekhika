<script lang="ts">
  import * as Select from '$lib/components/ui/select';
  import * as Avatar from '$lib/components/ui/avatar';
  import { type ScriptListType } from '$lipilekhika/index';
  import { getScriptAvatar } from '$components/script/script_avatar';

  let {
    script = $bindable()
  }: {
    script: ScriptListType;
  } = $props();

  const CATEGORIES = {
    modern: 'Modern Indian Scripts',
    romanized: 'Romanization Scripts',
    ancient: 'Ancient Scripts'
  } as const;

  /**
   * This script is used both for categorization and custom ordering of scripts.
   */
  const scripts: Record<ScriptListType, keyof typeof CATEGORIES> = {
    Devanagari: 'modern',
    Telugu: 'modern',
    Tamil: 'modern',
    Bengali: 'modern',
    Kannada: 'modern',
    Gujarati: 'modern',
    Malayalam: 'modern',
    Odia: 'modern',
    Gurumukhi: 'modern',
    Assamese: 'modern',
    Sinhala: 'modern',
    'Tamil-Extended': 'modern',
    'Purna-Devanagari': 'modern',
    // romanized
    Normal: 'romanized',
    Romanized: 'romanized',
    // ancient
    Brahmi: 'ancient',
    Sharada: 'ancient',
    Granth: 'ancient',
    Modi: 'ancient',
    Siddham: 'ancient'
  };
</script>

<Select.Root type="single" bind:value={script}>
  <Select.Trigger
    class="h-8 w-48 gap-x-0 space-x-0 border-border/50 bg-background/50 text-sm"
  >
    <Avatar.Root>
      <Avatar.Fallback>{getScriptAvatar(script)}</Avatar.Fallback>
    </Avatar.Root>
    {script}
  </Select.Trigger>
  <Select.Content class="max-h-96">
    {#each Object.entries(CATEGORIES) as [category, name]}
      <Select.Group>
        <Select.Label>{name}</Select.Label>
        {#each Object.entries(scripts).filter(([script, cat]) => cat === category) as [script_]}
          <Select.Item value={script_}>
            <Avatar.Root>
              <Avatar.Fallback>{getScriptAvatar(script_ as ScriptListType)}</Avatar.Fallback>
            </Avatar.Root>
            {script_}
          </Select.Item>
        {/each}
      </Select.Group>
    {/each}
  </Select.Content>
</Select.Root>
