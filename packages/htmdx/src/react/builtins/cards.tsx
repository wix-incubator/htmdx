import { cva } from 'class-variance-authority';
import { parseComponentBody } from '../../components/body-contracts';
import { validateRiskTable } from '../../components/risk-table';
import { Block, Inline, rawBody, splitFeature, type RawBodyProps } from './shell';

// Compare / Finding / Evidence share a `**Title:** text` card grid.
function FeatureGrid({ name, items }: { name: string; items: string[] }) {
  return (
    <Block name={name}>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => {
          const { title, text } = splitFeature(item);
          return (
            <div key={index} className="rounded-lg border bg-card p-4">
              {title ? (
                <div className="font-semibold text-card-foreground">
                  <Inline text={title} />
                </div>
              ) : null}
              <div className="text-sm text-muted-foreground">
                <Inline text={text} />
              </div>
            </div>
          );
        })}
      </div>
    </Block>
  );
}

function makeFeatureGrid(name: string) {
  return rawBody(({ body = '' }: RawBodyProps) => {
    const parsed = parseComponentBody(name, 'markdown-list-cards', body);
    return <FeatureGrid name={name} items={parsed.items} />;
  }, name);
}

export const Compare = makeFeatureGrid('Compare');
export const Finding = makeFeatureGrid('Finding');
export const Evidence = makeFeatureGrid('Evidence');

const TIERS = {
  'Must-have': 'must-have',
  Differentiator: 'differentiator',
  'Not now': 'not-now',
  "Won't do": 'wont-do',
} as const;

type Tier = (typeof TIERS)[keyof typeof TIERS];

const tierBadge = cva(
  'inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      tier: {
        'must-have': 'border-transparent bg-primary text-primary-foreground',
        differentiator: 'border-transparent bg-secondary text-secondary-foreground',
        'not-now': 'border-border bg-muted text-muted-foreground',
        'wont-do': 'border-transparent bg-destructive text-white',
      } satisfies Record<Tier, string>,
    },
  },
);

const TIER_LABEL: Record<Tier, string> = {
  'must-have': 'Must-have',
  differentiator: 'Differentiator',
  'not-now': 'Not now',
  'wont-do': "Won't do",
};

function tierOf(item: string): Tier {
  const name = item.match(/^\*\*(Must-have|Differentiator|Not now|Won't do):?\*\*/)?.[1];
  return name ? TIERS[name as keyof typeof TIERS] : 'wont-do';
}

export const RiskTable = rawBody(({ body = '' }: RawBodyProps) => {
  const parsed = parseComponentBody('RiskTable', 'markdown-list-cards', body, validateRiskTable);
  return (
    <Block name="RiskTable">
      <div className="flex flex-col gap-2">
        {parsed.items.map((item, index) => {
          const tier = tierOf(item);
          const { text } = splitFeature(item);
          return (
            <div key={index} className="flex items-start gap-3 rounded-lg border bg-card p-3">
              <span className={tierBadge({ tier })}>{TIER_LABEL[tier]}</span>
              <span className="text-sm text-muted-foreground">
                <Inline text={text} />
              </span>
            </div>
          );
        })}
      </div>
    </Block>
  );
}, 'RiskTable');

export const Timeline = rawBody(({ body = '' }: RawBodyProps) => {
  const items = parseComponentBody('Timeline', 'label-value-list', body);
  return (
    <Block name="Timeline">
      <div className="w-full rounded-[var(--md-sys-shape-corner-large)] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-lowest)] px-5 py-4 shadow-sm">
        {items.map((item, index) => (
          <div key={index} className="relative pt-1.5 pr-0 pb-[22px] pl-7 last:pb-1">
            <span className="absolute top-[13px] left-0 z-10 size-2.5 rounded-full border-2 border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container-lowest)]" />
            {index < items.length - 1 ? (
              <span className="absolute top-[18px] bottom-[-18px] left-1 w-0.5 bg-[var(--md-sys-color-primary)]" />
            ) : null}
            <span className="text-[var(--md-sys-color-on-surface)]">
              <Inline text={item.label} />:{' '}
            </span>
            <span className="text-[var(--md-sys-color-on-surface-variant)]">
              <Inline text={item.value} />
            </span>
          </div>
        ))}
      </div>
    </Block>
  );
}, 'Timeline');
