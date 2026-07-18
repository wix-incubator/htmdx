import { parseComponentBody } from '../../body-contracts';
import { cn } from '../../../react/shadcn/utils';
import {
  InlineMarkdown,
  splitFeature,
  StructuredBlock,
  type StructuredBodyProps,
} from '../shared/structured';
import { splitTone, TONE_TOP, type Tone } from '../shared/tones';

// A grid of category cards, each with a colored top accent. Used for Why-Now
// signals (category eyebrow + headline + body) and for the
// Problem / Root cause / Opportunity trio (category heading + body).
//
// Item: **Category | tone:** Headline — body   (headline optional)
//   - `Category` renders as a tone-colored uppercase eyebrow.
//   - `| tone` (blue/green/amber/red/gray/purple) sets the top accent.
//   - text before ` — ` is the bold headline; the rest is the body.
type Signal = { category: string; tone: Tone; headline?: string; body: string };

function parseSignal(item: string): Signal {
  const { title, text } = splitFeature(item);
  const { text: category, tone } = splitTone(title ?? '');
  const dash = text.match(/\s+—\s+/);
  if (dash && dash.index !== undefined) {
    return {
      category,
      tone,
      headline: text.slice(0, dash.index).trim(),
      body: text.slice(dash.index + dash[0].length).trim(),
    };
  }
  return { category, tone, body: text };
}

function columnsFor(count: number): string {
  if (count === 3) return 'sm:grid-cols-3';
  if (count % 2 === 0) return 'sm:grid-cols-2';
  return 'sm:grid-cols-2 lg:grid-cols-3';
}

export function SignalGrid({ body = '', className, ...attributes }: StructuredBodyProps) {
  const parsed = parseComponentBody('SignalGrid', 'markdown-list-cards', body);
  const signals = parsed.items.map(parseSignal);
  return (
    <StructuredBlock name="SignalGrid" className={className} {...attributes}>
      <div className={cn('grid gap-4', columnsFor(signals.length))}>
        {signals.map((signal, index) => (
          <div
            key={index}
            className={cn('rounded-lg border border-t-4 bg-card p-4', TONE_TOP[signal.tone])}
          >
            {signal.category ? (
              <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <InlineMarkdown text={signal.category} />
              </div>
            ) : null}
            {signal.headline ? (
              <div className="mt-2 font-semibold text-card-foreground">
                <InlineMarkdown text={signal.headline} />
              </div>
            ) : null}
            <div className={cn('text-sm text-muted-foreground', signal.headline ? 'mt-1' : 'mt-2')}>
              <InlineMarkdown text={signal.body} />
            </div>
          </div>
        ))}
      </div>
    </StructuredBlock>
  );
}
