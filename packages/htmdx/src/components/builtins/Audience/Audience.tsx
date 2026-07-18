import { parseComponentBody } from '../../body-contracts';
import { cn } from '../../../react/shadcn/utils';
import { toneChip, TONE_SURFACE, type Tone } from '../shared/tones';
import {
  InlineMarkdown,
  splitFeature,
  StructuredBlock,
  type StructuredBodyProps,
} from '../shared/structured';

type AudienceType = { label: string; tone: Tone; primary: boolean };
type Priority = { label: string; tone: Tone; warn?: boolean };

type Segment = {
  persona: string;
  type: AudienceType;
  description: string;
  metrics: { value: string; caption?: string }[];
  priority?: Priority;
};

function typeOf(raw: string): AudienceType {
  const value = raw.toLowerCase();
  if (value.startsWith('primary')) return { label: 'Primary User', tone: 'blue', primary: true };
  if (value.includes('risk')) return { label: 'Secondary · Risk', tone: 'amber', primary: false };
  return { label: 'Secondary', tone: 'gray', primary: false };
}

function priorityOf(raw: string): Priority | undefined {
  const value = raw.toLowerCase();
  if (!value) return undefined;
  if (value.startsWith('high')) return { label: 'High business priority', tone: 'green' };
  if (value.startsWith('medium')) return { label: 'Medium priority', tone: 'amber' };
  if (value.includes('unmeasured') || value.includes('risk'))
    return { label: 'Unmeasured risk', tone: 'red', warn: true };
  return { label: raw, tone: 'gray' };
}

function parseSegment(item: string): Segment {
  const { title, text } = splitFeature(item);
  const [persona = '', typeRaw = ''] = (title ?? '').split(/\s+—\s+/);
  const parts = text.split(/\s+·\s+/);
  let description = '';
  let metricsRaw = '';
  let priorityRaw = '';
  for (const part of parts) {
    if (/^metrics:/i.test(part)) metricsRaw = part.replace(/^metrics:/i, '').trim();
    else if (/^priority:/i.test(part)) priorityRaw = part.replace(/^priority:/i, '').trim();
    else if (!description) description = part.trim();
    else description += ` · ${part.trim()}`;
  }
  const metrics = metricsRaw
    ? metricsRaw.split(';').map((stat) => {
        const [value = '', caption = ''] = stat.split(/\s+—\s+/);
        return { value: value.trim(), caption: caption.trim() || undefined };
      })
    : [];
  return {
    persona,
    type: typeOf(typeRaw),
    description,
    metrics,
    priority: priorityOf(priorityRaw),
  };
}

function Footer({ priority }: { priority: Priority }) {
  return (
    <span className={cn(toneChip({ tone: priority.tone, emphasis: 'soft' }), 'mt-3')}>
      <span aria-hidden>●</span>
      {priority.warn ? <span aria-hidden>⚠</span> : null}
      {priority.label.toUpperCase()}
    </span>
  );
}

function Metrics({ metrics }: { metrics: Segment['metrics'] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
      {metrics.map((metric, index) => (
        <div key={index}>
          <div className="text-2xl font-bold text-foreground">
            <InlineMarkdown text={metric.value} />
          </div>
          {metric.caption ? (
            <div className="text-sm text-muted-foreground">
              <InlineMarkdown text={metric.caption} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SegmentCard({ segment, hero }: { segment: Segment; hero: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border p-5',
        hero ? cn('border-transparent', TONE_SURFACE[segment.type.tone]) : 'bg-card',
      )}
    >
      <span className={toneChip({ tone: segment.type.tone, emphasis: 'outline' })}>
        {segment.type.label.toUpperCase()}
      </span>
      <h3 className="mt-3 text-lg font-bold text-foreground">
        <InlineMarkdown text={segment.persona} />
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        <InlineMarkdown text={segment.description} />
      </p>
      {hero && segment.metrics.length ? <Metrics metrics={segment.metrics} /> : null}
      {segment.priority ? (
        <div className="mt-auto">
          <Footer priority={segment.priority} />
        </div>
      ) : null}
    </div>
  );
}

export function Audience({ body = '', className, ...attributes }: StructuredBodyProps) {
  const { items } = parseComponentBody('Audience', 'markdown-list-cards', body);
  const segments = items.map(parseSegment);
  const heroIndex = segments.findIndex((segment) => segment.type.primary);
  const hero = heroIndex >= 0 ? segments[heroIndex] : undefined;
  const rest = segments.filter((_, index) => index !== heroIndex);
  return (
    <StructuredBlock name="Audience" className={className} {...attributes}>
      <div className="flex flex-col gap-4">
        {hero ? <SegmentCard segment={hero} hero /> : null}
        {rest.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((segment, index) => (
              <SegmentCard key={index} segment={segment} hero={false} />
            ))}
          </div>
        ) : null}
      </div>
    </StructuredBlock>
  );
}
