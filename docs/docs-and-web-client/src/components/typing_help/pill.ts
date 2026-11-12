/**
 * Look of the small on/off pills around the source text box (typing, and the typing option
 * chips), laid over the shadcn `Toggle`. The on state is set for both `aria-pressed` and
 * `data-[state=on]`, so it replaces the Toggle's own `bg-muted` for each instead of fighting it.
 */
export const PILL_TOGGLE =
  'h-6 min-w-0 gap-1 rounded-full border border-border bg-background/80 px-2 text-xs font-normal text-muted-foreground hover:bg-accent hover:text-foreground aria-pressed:border-primary/40 aria-pressed:bg-primary/10 aria-pressed:text-foreground aria-pressed:hover:bg-primary/15 data-[state=on]:bg-primary/10 data-[state=on]:hover:bg-primary/15';
