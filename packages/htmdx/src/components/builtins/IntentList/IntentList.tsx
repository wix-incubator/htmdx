import { parseComponentBody } from '../../body-contracts';
import { cn } from '../../../react/shadcn/utils';
import {
  InlineMarkdown,
  splitFeature,
  StructuredBlock,
  type StructuredBodyProps,
} from '../shared/structured';
import { feelingChip, toneChip, TONE_BAR, TONE_SOFT, type Tone } from '../shared/tones';

// Priority tiers drive grouping order, the group badge tone, and each card's
// left accent bar.
const PRIORITIES = {
  blocker: { label: 'Blocker', tone: 'red', blurb: 'product fails without these' },
  critical: { label: 'Critical', tone: 'amber', blurb: 'significant gaps if missing' },
  'nice to have': { label: 'Nice to have', tone: 'gray', blurb: 'upside, not essential' },
} as const;

type PriorityKey = keyof typeof PRIORITIES;
const PRIORITY_ORDER: PriorityKey[] = ['blocker', 'critical', 'nice to have'];

function toList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

type Intent = {
  id: string;
  priorityKey: PriorityKey;
  persona: string;
  kind: string;
  quote: string;
  negatives: string[];
  positives: string[];
  note?: string;
};

// Each item:
// **#int-001 · Blocker · Self-Creator · Main intent:** "quote" — frustrated, resigned -> in control, professional · note: guardrail flag
// The optional trailing `· note: …` renders as a caution strip inside the card
// — use it only when an intent carries an extraordinary flag (e.g. a guardrail).
function parseIntent(item: string): Intent {
  const { title, text } = splitFeature(item);
  const segments = (title ?? '').split('·').map((segment) => segment.trim());
  const [id = '', priorityRaw = '', persona = '', kind = ''] = segments;
  const priorityKey = (PRIORITY_ORDER.find((key) => key === priorityRaw.toLowerCase()) ??
    'nice to have') as PriorityKey;

  const quoteMatch = text.match(
    /^\s*(?:“([\s\S]*?)”|"([\s\S]*?)"|‘([\s\S]*?)’|'([\s\S]*?)')\s*(?=[—–-]|$)/,
  );
  const quote = quoteMatch?.slice(1).find((capture) => capture !== undefined) ?? '';
  let rest = (quoteMatch ? text.slice(quoteMatch[0].length) : text)
    .replace(/^\s*[—–-]\s*/, '')
    .trim();

  let note: string | undefined;
  const noteMatch = rest.match(/(?:[·—–-]\s*)?note:\s*([\s\S]+)$/i);
  if (noteMatch) {
    note = noteMatch[1].trim();
    rest = rest
      .slice(0, noteMatch.index)
      .replace(/[·—–-]\s*$/, '')
      .trim();
  }

  const [negRaw = '', posRaw = ''] = rest.split(/->|→/);

  return {
    id,
    priorityKey,
    persona,
    kind,
    quote,
    negatives: toList(negRaw),
    positives: toList(posRaw),
    note,
  };
}

function IntentCard({ intent }: { intent: Intent }) {
  const tone = PRIORITIES[intent.priorityKey].tone as Tone;
  return (
    <div className={cn('rounded-lg border border-l-4 bg-card p-4', TONE_BAR[tone])}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-sm text-muted-foreground">{intent.id}</span>
        {intent.persona ? (
          <span className="text-xs text-muted-foreground/70">{intent.persona}</span>
        ) : null}
        {intent.kind ? (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <InlineMarkdown text={intent.kind} />
          </span>
        ) : null}
      </div>
      {intent.quote ? (
        <p className="mt-2 text-base text-card-foreground italic">
          “<InlineMarkdown text={intent.quote} />”
        </p>
      ) : null}
      {intent.negatives.length || intent.positives.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {intent.negatives.map((feeling, index) => (
            <span key={`n-${index}`} className={feelingChip({ kind: 'negative' })}>
              <InlineMarkdown text={feeling} />
            </span>
          ))}
          {intent.negatives.length && intent.positives.length ? (
            <span aria-hidden className="text-muted-foreground">
              →
            </span>
          ) : null}
          {intent.positives.map((feeling, index) => (
            <span key={`p-${index}`} className={feelingChip({ kind: 'positive' })}>
              <InlineMarkdown text={feeling} />
            </span>
          ))}
        </div>
      ) : null}
      {intent.note ? (
        <div
          className={cn(
            'mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-sm',
            TONE_SOFT.amber,
          )}
        >
          <span aria-hidden>⚠</span>
          <span>
            <InlineMarkdown text={intent.note} />
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function IntentList({ body = '', className, ...attributes }: StructuredBodyProps) {
  const parsed = parseComponentBody('IntentList', 'markdown-list-cards', body);
  const intents = parsed.items.map(parseIntent);
  const groups = PRIORITY_ORDER.map((key) => ({
    key,
    spec: PRIORITIES[key],
    intents: intents.filter((intent) => intent.priorityKey === key),
  })).filter((group) => group.intents.length > 0);

  return (
    <StructuredBlock name="IntentList" className={className} {...attributes}>
      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className={toneChip({ tone: group.spec.tone as Tone, emphasis: 'outline' })}>
                {group.spec.label.toUpperCase()}
              </span>
              <span className="text-sm text-muted-foreground">
                {group.intents.length} {group.intents.length === 1 ? 'intent' : 'intents'} —{' '}
                {group.spec.blurb}
              </span>
            </div>
            {group.intents.map((intent, index) => (
              <IntentCard key={index} intent={intent} />
            ))}
          </div>
        ))}
      </div>
    </StructuredBlock>
  );
}
