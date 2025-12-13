<script lang="ts">
  interface Props {
    checked?: boolean;
    label?: string;
    class?: string;
    trackClass?: string;
    thumbClass?: string;
  }

  let {
    checked = $bindable(false),
    label,
    class: className,
    trackClass,
    thumbClass
  }: Props = $props();
</script>

<button
  type="button"
  role="switch"
  aria-label={label}
  aria-checked={checked}
  class="relative inline-flex items-center rounded-full transition-colors focus:ring-2 focus:ring-teal-500/30 focus:ring-offset-2 focus:ring-offset-slate-950 focus:outline-none {trackClass ||
    ''} {className || ''}"
  class:bg-teal-500={checked}
  class:bg-slate-700={!checked}
  onclick={() => {
    checked = !checked;
  }}
>
  <span
    class="inline-block transform rounded-full bg-white transition-transform {thumbClass || ''}"
    class:translate-x-[150%]={checked}
    class:translate-x-[25%]={!checked}
  ></span>
</button>
