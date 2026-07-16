import { cva } from 'class-variance-authority';
import { parseComponentBody } from '../../components/body-contracts';
import { Block, Inline, rawBody, stripWrappingBold, type RawBodyProps } from './shell';

// A leading trend glyph on a metric label is read as directional intent:
// up = improvement (green), down = reduction/good-when-lower (red), guard =
// guardrail metric to hold, not move (amber). The glyph is lifted out of the
// label so it can be colored independently of the label text.
const DIRECTIONS = {
  up: { glyph: '↑', match: ['↑', '▲'] },
  down: { glyph: '↓', match: ['↓', '▼'] },
  guard: { glyph: '⊘', match: ['⊘', '⚠'] },
} as const;

type Direction = keyof typeof DIRECTIONS;

const trendGlyph = cva('mr-1.5 inline-block text-base font-bold leading-none', {
  variants: {
    dir: {
      up: 'text-emerald-600 dark:text-emerald-400',
      down: 'text-red-600 dark:text-red-400',
      guard: 'text-amber-600 dark:text-amber-400',
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

// A metric value may carry a muted caption after an ` — ` (em dash) or `·`
// separator, e.g. `**baseline 0** — post-launch cohort`, so a KPI can add the
// context that makes the number meaningful without a second component.
function splitCaption(value: string): { headline: string; caption?: string } {
  const match = value.match(/^(.*?)\s+(?:—|·)\s+(.*)$/);
  return match ? { headline: match[1], caption: match[2] } : { headline: value };
}

export const MetricStrip = rawBody(({ body = '' }: RawBodyProps) => {
  const items = parseComponentBody('MetricStrip', 'label-value-list', body);
  return (
    <Block name="MetricStrip">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item, index) => {
          const { dir, rest } = splitTrend(item.label);
          const { headline, caption } = splitCaption(stripWrappingBold(item.value));
          return (
            <div key={index} className="rounded-lg border bg-card px-4 py-3">
              <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {dir ? <span className={trendGlyph({ dir })}>{DIRECTIONS[dir].glyph}</span> : null}
                <Inline text={rest} />
              </div>
              <div className="mt-1 text-2xl font-semibold text-card-foreground">
                <Inline text={headline} />
              </div>
              {caption ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  <Inline text={caption} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Block>
  );
}, 'MetricStrip');

export const Stat = rawBody(({ body = '' }: RawBodyProps) => {
  const items = parseComponentBody('Stat', 'label-value-list', body);
  return (
    <Block name="Stat">
      <div className="flex flex-wrap gap-8">
        {items.map((item, index) => (
          <div key={index} className="flex flex-col">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              <Inline text={stripWrappingBold(item.value)} />
            </span>
            <span className="text-sm text-muted-foreground">
              <Inline text={item.label} />
            </span>
          </div>
        ))}
      </div>
    </Block>
  );
}, 'Stat');
