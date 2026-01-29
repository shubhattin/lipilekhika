<script lang="ts">
  import * as Select from '~/lib/components/ui/select';
  import { PRESETS, type PresetListType } from '~/tools/presets';
  import { InfoIcon } from 'lucide-svelte';
  import * as Popover from '~/lib/components/ui/popover';
  import Button from '~/lib/components/ui/button/button.svelte';

  let { preset = $bindable() }: { preset: PresetListType } = $props();

  const presetKeys = Object.keys(PRESETS) as PresetListType[];
</script>

<div class="flex items-center gap-3">
  <span class="text-sm font-medium tracking-wide text-muted-foreground">Preset</span>
  <div class="flex items-center gap-2">
    <Select.Root type="single" bind:value={preset}>
      <Select.Trigger class="w-[200px]">
        {PRESETS[preset]?.label ?? 'Select Preset'}
      </Select.Trigger>
      <Select.Content>
        {#each presetKeys as presetKey (presetKey)}
          <Select.Item value={presetKey}>{PRESETS[presetKey].label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
    {#if preset !== 'none' && PRESETS[preset]?.description}
      <Popover.Root>
        <Popover.Trigger>
          <Button variant="ghost" size="icon" class="size-8" aria-label="Preset details">
            <InfoIcon class="size-4" />
          </Button>
        </Popover.Trigger>
        <Popover.Content class="w-80">
          <p class="text-sm">{PRESETS[preset].description}</p>
        </Popover.Content>
      </Popover.Root>
    {/if}
  </div>
</div>
