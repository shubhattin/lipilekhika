<script lang="ts">
  import { Icon, type IconType } from 'svelte-icons-pack';
  import { BookOpen, ExternalLink, ArrowRight } from 'lucide-svelte';
  import { BsGithub } from 'svelte-icons-pack/bs';
  import CopyButton from '$components/CopyButton.svelte';
  import {
    RustIcon,
    SvelteIcon,
    GoIcon,
    JavaScriptIcon,
    PythonIcon,
    ReactIcon,
    SolidIcon,
    VueIcon,
    WasmIcon
  } from '~/tools/icons';

  type Package = {
    name: string;
    icon: IconType;
    icon_class: string;
    description: string;
    install: string;
    guide: string;
    registry: { label: string; url: string };
  };

  const PACKAGES: Package[] = [
    {
      name: 'JavaScript',
      icon: JavaScriptIcon,
      icon_class: 'size-8',
      description:
        'Typesafe and tree-shakable, for ESM, CommonJS and UMD. Includes the typing module.',
      install: 'npm install lipilekhika',
      guide: '/getting-started/javascript',
      registry: { label: 'npm', url: 'https://www.npmjs.com/package/lipilekhika' }
    },
    {
      name: 'Rust',
      icon: RustIcon,
      icon_class: 'size-11 -mt-1',
      description: 'Script data embedded at compile time, no_std compatible by default.',
      install: 'cargo add lipilekhika',
      guide: '/getting-started/rust',
      registry: { label: 'crates.io', url: 'https://crates.io/crates/lipilekhika' }
    },
    {
      name: 'Python',
      icon: PythonIcon,
      icon_class: 'size-11',
      description: 'Full type hints, backed by the Rust engine for fast transliteration.',
      install: 'pip install lipilekhika',
      guide: '/getting-started/python',
      registry: { label: 'PyPI', url: 'https://pypi.org/project/lipilekhika/' }
    },
    {
      name: 'Go',
      icon: GoIcon,
      icon_class: 'size-11',
      description: 'Fast transliteration with a realtime typing module. Go 1.23+.',
      install: 'go get github.com/shubhattin/lipilekhika/packages/go/lipilekhika',
      guide: '/getting-started/go',
      registry: {
        label: 'pkg.go.dev',
        url: 'https://pkg.go.dev/github.com/shubhattin/lipilekhika/packages/go/lipilekhika'
      }
    }
  ];

  const INTEGRATIONS = [
    { name: 'React', icon: ReactIcon, href: '/getting-started/browser_typing_tool/#react' },
    { name: 'Svelte', icon: SvelteIcon, href: '/getting-started/browser_typing_tool/#svelte' },
    { name: 'SolidJS', icon: SolidIcon, href: '/getting-started/browser_typing_tool/#solid' },
    { name: 'Vue', icon: VueIcon, href: '/getting-started/browser_typing_tool/#vue' }
  ];

  const kw = (t: string) => `<span class="text-violet-600 dark:text-violet-400">${t}</span>`;
  const str = (t: string) => `<span class="text-emerald-700 dark:text-emerald-400">'${t}'</span>`;
  const fn = (t: string) => `<span class="text-sky-700 dark:text-sky-400">${t}</span>`;
  const comment = (t: string) => `<span class="text-muted-foreground">${t}</span>`;
  /** Static, hand-highlighted snippet (no user input) */
  const QUICK_START_HTML = [
    `${kw('import')} { ${fn('transliterate')} } ${kw('from')} ${str('lipilekhika')};`,
    '',
    `${kw('const')} text = ${kw('await')} ${fn('transliterate')}(`,
    `  ${str('namaste')}, ${str('Normal')}, ${str('Devanagari')}`,
    `);`,
    `${comment('// → <span class="font-devanagari">नमस्ते</span>')}`
  ].join('\n');

  const card_class =
    'rounded-2xl border border-border/60 bg-linear-to-b from-white to-slate-50 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:bg-card/60 dark:bg-none dark:shadow-none';
</script>

<section
  class="border-t border-border/40 bg-linear-to-b from-muted/30 via-background to-background py-16"
>
  <div class="mx-auto max-w-6xl px-4 sm:px-6">
    <div class="flex flex-col items-center gap-5 text-center sm:mb-2">
      <div>
        <h2 class="text-2xl font-bold tracking-tight sm:text-3xl">Build with Lipi Lekhika</h2>
        <p class="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          The same engine that powers this site, as a library for JavaScript, Rust, Python and Go.
        </p>
      </div>
      <div class="flex flex-wrap justify-center gap-2.5">
        <a
          href="/getting-started/introduction"
          class="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md"
        >
          <BookOpen class="size-4" />
          Documentation
        </a>
        <a
          href="https://github.com/shubhattin/lipilekhika"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:bg-accent/40 hover:shadow-md"
        >
          <Icon src={BsGithub} className="size-4" />
          GitHub
        </a>
      </div>
    </div>

    <div class="mt-10 grid gap-6 lg:grid-cols-5">
      <!-- Packages -->
      <div class="grid gap-3 sm:grid-cols-2 lg:col-span-3">
        {#each PACKAGES as pkg (pkg.name)}
          <div class={'flex min-w-0 flex-col gap-3 p-4 ' + card_class}>
            <div class="flex items-center gap-3">
              <span class="inline-flex size-9 shrink-0 items-center justify-center">
                <Icon src={pkg.icon} className={pkg.icon_class} />
              </span>
              <a
                href={pkg.guide}
                class="group inline-flex items-center gap-1 font-medium hover:text-primary"
              >
                {pkg.name}
                <ArrowRight
                  class="size-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                />
              </a>
              <a
                href={pkg.registry.url}
                target="_blank"
                rel="noopener noreferrer"
                class="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {pkg.registry.label}
                <ExternalLink class="size-3" />
              </a>
            </div>
            <p class="text-xs leading-relaxed text-muted-foreground">{pkg.description}</p>
            <div
              class="mt-auto flex items-center gap-1 rounded-lg border border-border/60 bg-muted/60 py-1 pr-1 pl-3 dark:bg-background/60"
            >
              <code class="min-w-0 flex-1 truncate font-mono text-xs" title={pkg.install}>
                <span class="mr-1.5 text-muted-foreground select-none">$</span>{pkg.install}
              </code>
              <CopyButton
                text={pkg.install}
                label={`Copy ${pkg.name} install command`}
                class="size-7"
              />
            </div>
          </div>
        {/each}
      </div>

      <!-- Quick start + integrations -->
      <div class="flex min-w-0 flex-col gap-3 lg:col-span-2">
        <div class={'overflow-hidden ' + card_class}>
          <div
            class="flex items-center justify-between border-b border-border/60 px-4 py-2 text-xs text-muted-foreground"
          >
            <span class="font-medium">Quick start</span>
            <span class="font-mono">index.ts</span>
          </div>
          <pre
            class="overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed sm:text-[0.8rem]"><code
              >{@html QUICK_START_HTML}</code
            ></pre>
        </div>

        <div class={'p-4 ' + card_class}>
          <p class="text-sm font-medium">Typing in your web app</p>
          <p class="mt-1 text-xs text-muted-foreground">
            Add realtime typing to any input with <code class="font-mono">lipilekhika/typing</code>.
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            {#each INTEGRATIONS as integration (integration.name)}
              <a
                href={integration.href}
                class="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-sm transition-all hover:border-border hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Icon src={integration.icon} className="size-4" />
                {integration.name}
              </a>
            {/each}
          </div>
        </div>

        <a
          href="/getting-started/wasm"
          class={'group flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-border ' +
            card_class}
        >
          <span class="inline-flex size-9 shrink-0 items-center justify-center">
            <Icon src={WasmIcon} className="size-11" />
          </span>
          <span class="min-w-0">
            <span class="block text-sm font-medium">WebAssembly</span>
            <span class="block text-xs text-muted-foreground"
              >Rust-powered build, also for Workers and Edge runtimes</span
            >
          </span>
          <ArrowRight
            class="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          />
        </a>
      </div>
    </div>
  </div>
</section>
