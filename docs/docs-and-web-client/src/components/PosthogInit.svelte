<script lang="ts">
  import { onMount } from 'svelte';

  const browser = typeof window !== 'undefined';

  onMount(() => {
    if (browser && import.meta.env.PROD && import.meta.env.PUBLIC_POSTHOG_KEY) {
      import('posthog-js').then((posthog) => {
        posthog.default.init('phc_y8UlCvSTINBe6rsfcfkC6lZ2eeEYlucpFqWCudbUL4Z', {
          api_host: 'https://us.i.posthog.com',
          defaults: '2025-11-30',
          person_profiles: 'identified_only' // or 'always' to create profiles for anonymous users as well
        });
      });
    }
  });
</script>
