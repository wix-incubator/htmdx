import { cva } from 'class-variance-authority';
import type { LabelValue } from '../../body-contracts';
import { TONE_DOT } from '../../../react/builtins/tones';
import { InlineMarkdown, stripWrappingBold } from './structured';

const DIRECTIONS = {
  up: { glyph: '↑', match: ['↑', '▲'] },
  down: { glyph: '↓', match: ['↓', '▼'] },
  guard: { glyph: '⊘', match: ['⊘', '⚠'] },
} as const;

type Direction = keyof typeof DIRECTIONS;

const trendGlyph = cva('mr-1.5 inline-block text-base font-bold leading-none', {
  variants: {
    dir: {
      up: TONE_DOT.green,
      down: TONE_DOT.red,
      guard: TONE_DOT.amber,
    } satisfies Record<Direction, string>,
  },
});

function splitTrend(label: string): { dir?: Direction; rest: string } {
  const trimmed = label.trimStart();
  for (const [dir, spec] of Object.entries(DIRECTIONS) as [
    Direction,
    (typeof DIRECTIONS)[Direction],
  ][]) {
    if (spec.match.some((glyph) => trimmed.startsWith(glyph))) {
      return { dir, rest: trimmed.slice(1).trim() };
    }
  }
  return { rest: label };
}

function splitCaption(value: string): { headline: string; caption?: string } {
  const match = value.match(/^(.*?)\s+(?:—|·)\s+(.*)$/);
  return match ? { headline: match[1], caption: match[2] } : { headline: value };
}

export function MetricStripItems({ items }: { items: LabelValue[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item, index) => {
        const { dir, rest } = splitTrend(item.label);
        const { headline, caption } = splitCaption(stripWrappingBold(item.value));
        return (
          <div key={index} className="rounded-lg border bg-card px-4 py-3">
            <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {dir ? <span className={trendGlyph({ dir })}>{DIRECTIONS[dir].glyph}</span> : null}
              <InlineMarkdown text={rest} />
            </div>
            <div className="mt-1 text-2xl font-semibold text-card-foreground">
              <InlineMarkdown text={headline} />
            </div>
            {caption ? (
              <div className="mt-1 text-xs text-muted-foreground">
                <InlineMarkdown text={caption} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function StatItems({ items }: { items: LabelValue[] }) {
  return (
    <div className="flex flex-wrap gap-8">
      {items.map((item, index) => (
        <div key={index} className="flex flex-col">
          <span className="text-3xl font-bold tracking-tight text-foreground">
            <InlineMarkdown text={stripWrappingBold(item.value)} />
          </span>
          <span className="text-sm text-muted-foreground">
            <InlineMarkdown text={item.label} />
          </span>
        </div>
      ))}
    </div>
  );
}
