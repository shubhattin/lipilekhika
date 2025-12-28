<script lang="ts">
  import { Icon } from 'svelte-icons-pack';
  import {
    RustIcon,
    SvelteIcon,
    GoIcon,
    JavaScriptIcon,
    PythonIcon,
    ReactIcon,
    SolidIcon,
    VueIcon
  } from '~/tools/icons';
</script>

<section class="border-t border-border/40 bg-muted/10 py-14">
  <div class="mx-auto max-w-6xl px-4 sm:px-6">
    <div class="grid gap-10 lg:grid-cols-2 lg:gap-12">
      <!-- Packages -->
      <div>
        <h2 class="text-xl font-semibold tracking-tight">Packages</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          Lipi Lekhika is being built across multiple languages. JavaScript is available today.
        </p>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <a
            href="https://www.npmjs.com/package/lipilekhika"
            target="_blank"
            rel="noopener noreferrer"
            class="group rounded-xl border border-border/60 bg-background/60 p-4 transition-colors hover:border-border hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <div class="flex items-center gap-3">
              <span
                class="inline-flex size-9 items-center justify-center rounded-lg bg-background transition-colors group-hover:bg-accent/60"
              >
                <Icon src={JavaScriptIcon} className="size-9" />
              </span>
              <div class="min-w-0">
                <p class="leading-tight font-medium">JavaScript</p>
                <p class="text-xs text-muted-foreground">npm package • available</p>
              </div>
            </div>
          </a>
          <div
            class="rounded-xl border border-border/60 bg-background/40 p-4 transition-colors hover:border-border hover:bg-accent/20"
          >
            <div class="flex items-center gap-3">
              <span class="inline-flex size-9 items-center justify-center rounded-lg bg-background">
                <Icon src={RustIcon} className="size-12 -mt-1" />
              </span>
              <div class="min-w-0">
                <p class="leading-tight font-medium">Rust</p>
                <p class="text-xs text-muted-foreground">upcoming</p>
              </div>
            </div>
          </div>
          <div
            class="rounded-xl border border-border/60 bg-background/40 p-4 transition-colors hover:border-border hover:bg-accent/20"
          >
            <div class="flex items-center gap-3">
              <span class="inline-flex size-9 items-center justify-center rounded-lg bg-background">
                <Icon src={GoIcon} className="size-12" />
              </span>
              <div class="min-w-0">
                <p class="leading-tight font-medium">Go</p>
                <p class="text-xs text-muted-foreground">planned</p>
              </div>
            </div>
          </div>
          <div
            class="rounded-xl border border-border/60 bg-background/40 p-4 transition-colors hover:border-border hover:bg-accent/20"
          >
            <div class="flex items-center gap-3">
              <span class="inline-flex size-9 items-center justify-center rounded-lg bg-background">
                <Icon src={PythonIcon} className="size-12" />
              </span>
              <div class="min-w-0">
                <p class="leading-tight font-medium">Python</p>
                <p class="text-xs text-muted-foreground">planned</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Integrations -->
      <div>
        <h2 class="text-xl font-semibold tracking-tight">Typing module integrations</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          The typing module can be accessed from React, Svelte, SolidJS, and VueJS.
        </p>

        <div class="mt-5 flex flex-wrap gap-2.5">
          <a
            href="/getting-started/browser_typing_tool/#react"
            class="group rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <span
              class="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-sm transition-colors group-hover:border-border group-hover:bg-accent group-hover:text-accent-foreground"
            >
              <Icon src={ReactIcon} className="size-5" />
              React
            </span>
          </a>
          <a
            href="/getting-started/browser_typing_tool/#svelte"
            class="group rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <span
              class="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-sm transition-colors group-hover:border-border group-hover:bg-accent group-hover:text-accent-foreground"
            >
              <Icon src={SvelteIcon} className="size-5" />
              Svelte
            </span>
          </a>
          <a
            href="/getting-started/browser_typing_tool/#solid"
            class="group rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <span
              class="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-sm transition-colors group-hover:border-border group-hover:bg-accent group-hover:text-accent-foreground"
            >
              <Icon src={SolidIcon} className="size-5" />
              SolidJS
            </span>
          </a>
          <a
            href="/getting-started/browser_typing_tool/#vue"
            class="group rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <span
              class="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-sm transition-colors group-hover:border-border group-hover:bg-accent group-hover:text-accent-foreground"
            >
              <Icon src={VueIcon} className="size-5" />
              VueJS
            </span>
          </a>
        </div>

        <p class="mt-4 text-xs text-muted-foreground">
          Tip: in JavaScript you can import typing helpers from <span class="font-mono"
            >lipilekhika/typing</span
          >.
        </p>
      </div>
    </div>
  </div>
</section>
