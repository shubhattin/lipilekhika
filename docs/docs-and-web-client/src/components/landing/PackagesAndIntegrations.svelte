<script lang="ts">
  import { Icon } from 'svelte-icons-pack';
  import { FaBrandsJs, FaBrandsRust, FaBrandsReact, FaBrandsVuejs } from 'svelte-icons-pack/fa';
  import { AiOutlinePython } from 'svelte-icons-pack/ai';
  import { RiLogosSvelteFill } from 'svelte-icons-pack/ri';
  import { TrOutlineBrandSolidjs } from 'svelte-icons-pack/tr';
</script>

<section class="border-t border-border/40 bg-muted/10 py-14">
  <div class="mx-auto max-w-6xl px-4 sm:px-6">
    <div class="grid gap-10 lg:grid-cols-2 lg:gap-12">
      <!-- Packages -->
      <div>
        <h2 class="text-xl font-semibold tracking-tight">Packages</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          Lipi Lekhika is being built across multiple languages. JavaScript/TypeScript is available
          today.
        </p>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <a
            href="https://www.npmjs.com/package/lipilekhika"
            target="_blank"
            rel="noopener noreferrer"
            class="group rounded-xl border border-border/60 bg-background/60 p-4 transition-colors hover:bg-background"
          >
            <div class="flex items-center gap-3">
              <span class="inline-flex size-9 items-center justify-center rounded-lg bg-background">
                <Icon src={FaBrandsJs} className="size-5" />
              </span>
              <div class="min-w-0">
                <p class="leading-tight font-medium">JavaScript / TypeScript</p>
                <p class="text-xs text-muted-foreground">npm package • available</p>
              </div>
            </div>
          </a>

          <div class="rounded-xl border border-border/60 bg-background/40 p-4">
            <div class="flex items-center gap-3">
              <span class="inline-flex size-9 items-center justify-center rounded-lg bg-background">
                <Icon src={AiOutlinePython} className="size-5" />
              </span>
              <div class="min-w-0">
                <p class="leading-tight font-medium">Python</p>
                <p class="text-xs text-muted-foreground">coming soon</p>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-border/60 bg-background/40 p-4">
            <div class="flex items-center gap-3">
              <span
                class="inline-flex size-9 items-center justify-center rounded-lg bg-background text-sm font-semibold"
              >
                Go
              </span>
              <div class="min-w-0">
                <p class="leading-tight font-medium">Go</p>
                <p class="text-xs text-muted-foreground">coming soon</p>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-border/60 bg-background/40 p-4">
            <div class="flex items-center gap-3">
              <span class="inline-flex size-9 items-center justify-center rounded-lg bg-background">
                <Icon src={FaBrandsRust} className="size-5" />
              </span>
              <div class="min-w-0">
                <p class="leading-tight font-medium">Rust</p>
                <p class="text-xs text-muted-foreground">active development</p>
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
          <span
            class="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-sm"
          >
            <Icon src={FaBrandsReact} className="size-4" />
            React
          </span>
          <span
            class="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-sm"
          >
            <Icon src={RiLogosSvelteFill} className="size-4" />
            Svelte
          </span>
          <span
            class="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-sm"
          >
            <Icon src={TrOutlineBrandSolidjs} className="size-4" />
            SolidJS
          </span>
          <span
            class="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-sm"
          >
            <Icon src={FaBrandsVuejs} className="size-4" />
            VueJS
          </span>
        </div>

        <p class="mt-4 text-xs text-muted-foreground">
          Tip: in JavaScript/TypeScript you can import typing helpers from <span class="font-mono"
            >lipilekhika/typing</span
          >.
        </p>
      </div>
    </div>
  </div>
</section>
