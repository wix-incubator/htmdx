import { cva } from 'class-variance-authority';

// Shared semantic tone system for built-in badges, labels, and accents.
// The zinc shadcn theme has no success/warning/info tokens, so these map to
// the Tailwind palette directly and render consistently across artifacts.
//
// blue = primary / assumption / informational
// green = positive / high / success
// amber = medium / caution / open
// red = blocker / risk / negative
// gray = secondary / neutral
// purple = shopper / guardrail accent
export type Tone = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'purple';

// A pill/label. `outline` = colored text + border on transparent; `soft` =
// tinted background + colored text (used for filled status pills and chips).
export const toneChip = cva(
  'inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide whitespace-nowrap',
  {
    variants: {
      tone: {
        blue: '',
        green: '',
        amber: '',
        red: '',
        gray: '',
        purple: '',
      } satisfies Record<Tone, string>,
      emphasis: { outline: 'bg-transparent', soft: 'border-transparent' },
    },
    compoundVariants: [
      {
        tone: 'blue',
        emphasis: 'outline',
        class: 'border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-300',
      },
      {
        tone: 'green',
        emphasis: 'outline',
        class: 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300',
      },
      {
        tone: 'amber',
        emphasis: 'outline',
        class: 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300',
      },
      {
        tone: 'red',
        emphasis: 'outline',
        class: 'border-red-300 text-red-700 dark:border-red-800 dark:text-red-300',
      },
      { tone: 'gray', emphasis: 'outline', class: 'border-border text-muted-foreground' },
      {
        tone: 'purple',
        emphasis: 'outline',
        class: 'border-violet-300 text-violet-700 dark:border-violet-800 dark:text-violet-300',
      },
      {
        tone: 'blue',
        emphasis: 'soft',
        class: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      },
      {
        tone: 'green',
        emphasis: 'soft',
        class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
      },
      {
        tone: 'amber',
        emphasis: 'soft',
        class: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
      },
      {
        tone: 'red',
        emphasis: 'soft',
        class: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
      },
      { tone: 'gray', emphasis: 'soft', class: 'bg-muted text-muted-foreground' },
      {
        tone: 'purple',
        emphasis: 'soft',
        class: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
      },
    ],
    defaultVariants: { tone: 'gray', emphasis: 'outline' },
  },
);

// Left accent bar color per tone (used by IntentList cards).
export const TONE_BAR: Record<Tone, string> = {
  blue: 'border-l-blue-500',
  green: 'border-l-emerald-500',
  amber: 'border-l-amber-500',
  red: 'border-l-red-500',
  gray: 'border-l-border',
  purple: 'border-l-violet-500',
};

// Top accent bar color per tone (used by SignalGrid cards).
export const TONE_TOP: Record<Tone, string> = {
  blue: 'border-t-blue-500',
  green: 'border-t-emerald-500',
  amber: 'border-t-amber-500',
  red: 'border-t-red-500',
  gray: 'border-t-border',
  purple: 'border-t-violet-500',
};

// Dot/glyph text color per tone (used for effort dots in DecisionMatrix).
export const TONE_DOT: Record<Tone, string> = {
  blue: 'text-blue-500',
  green: 'text-emerald-500',
  amber: 'text-amber-500',
  red: 'text-red-500',
  gray: 'text-muted-foreground',
  purple: 'text-violet-500',
};

// Soft tinted surface per tone (used for the primary Audience card).
export const TONE_SURFACE: Record<Tone, string> = {
  blue: 'bg-blue-50/60 dark:bg-blue-950/30',
  green: 'bg-emerald-50/60 dark:bg-emerald-950/30',
  amber: 'bg-amber-50/60 dark:bg-amber-950/30',
  red: 'bg-red-50/60 dark:bg-red-950/30',
  gray: 'bg-muted/40',
  purple: 'bg-violet-50/60 dark:bg-violet-950/30',
};

// Parse a `label | tone` convention, defaulting to gray when absent/unknown.
export function splitTone(label: string, fallback: Tone = 'gray'): { text: string; tone: Tone } {
  const match = label.match(/^(.*?)\s*\|\s*(blue|green|amber|red|gray|purple)\s*$/i);
  if (!match) return { text: label.trim(), tone: fallback };
  return { text: match[1].trim(), tone: match[2].toLowerCase() as Tone };
}

// Soft chip for feelings: negative = red, positive = green.
export const feelingChip = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-sm font-medium',
  {
    variants: {
      kind: {
        negative: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
        positive: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
      },
    },
  },
);
