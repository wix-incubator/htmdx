import { cva } from 'class-variance-authority';
import { BodyContractError, parseComponentBody, type MarkdownListCards } from './body-contracts';
import { Block, Inline, rawBody, splitFeature, type RawBodyProps } from './shell';
import type { HtmdxComponent } from './types';

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
      <ol className="flex flex-col gap-4 border-l border-border pl-6">
        {items.map((item, index) => (
          <li key={index} className="relative">
            <span className="absolute top-1 -left-[1.90rem] size-3 rounded-full border-2 border-background bg-primary" />
            <div className="font-medium text-foreground">
              <Inline text={item.label} />
            </div>
            <div className="text-sm text-muted-foreground">
              <Inline text={item.value} />
            </div>
          </li>
        ))}
      </ol>
    </Block>
  );
}, 'Timeline');

const RISK_TIERS = ['Must-have', 'Differentiator', 'Not now', "Won't do"] as const;

export function validateRiskTable(body: MarkdownListCards) {
  const seen = new Set<string>();
  body.items.forEach((item, index) => {
    const match = item.match(/^\*\*(Must-have|Differentiator|Not now|Won't do):?\*\*:?\s+(.+)$/);
    if (!match) {
      throw new BodyContractError(
        'each risk item must begin with one canonical, case-sensitive bold tier followed by text',
        `a unique bold tier (${RISK_TIERS.join(', ')}) and non-empty text`,
        body.lines[index],
      );
    }
    const tier = match[1];
    const tierMarkers = item.match(/\*\*(?:Must-have|Differentiator|Not now|Won't do):?\*\*/g);
    if (tierMarkers?.length !== 1) {
      throw new BodyContractError(
        'each risk item must contain exactly one canonical bold tier',
        'one canonical bold tier at the beginning of each item',
        body.lines[index],
      );
    }
    if (seen.has(tier)) {
      throw new BodyContractError(
        `tier "${tier}" is repeated`,
        'each canonical risk tier at most once',
        body.lines[index],
      );
    }
    seen.add(tier);
  });
}

export const compare = {
  name: 'Compare',
  body: 'markdown-list-cards',
  purpose: 'Place alternatives or contrasting concepts side by side.',
  example:
    '<Compare>\n- **Current:** Manual component discovery\n- **Proposed:** Versioned manifest\n</Compare>',
  component: Compare,
} satisfies HtmdxComponent;

export const finding = {
  name: 'Finding',
  body: 'markdown-list-cards',
  purpose: 'Present key findings as a scannable list.',
  example: '<Finding>\n- **Drift:** Runtime support is not machine-discoverable.\n</Finding>',
  component: Finding,
} satisfies HtmdxComponent;

export const evidence = {
  name: 'Evidence',
  body: 'markdown-list-cards',
  purpose: 'List evidence that supports the surrounding analysis.',
  example:
    '<Evidence>\n- **Runtime:** The allowlist currently lives in implementation code.\n</Evidence>',
  component: Evidence,
} satisfies HtmdxComponent;

export const riskTable = {
  name: 'RiskTable',
  body: 'markdown-list-cards',
  purpose: 'Classify priorities using the canonical product-planning tiers.',
  example:
    '<RiskTable>\n- **Must-have:** Publish exact-version metadata.\n- **Not now:** Describe host components.\n</RiskTable>',
  component: RiskTable,
  validate: validateRiskTable,
} satisfies HtmdxComponent;

export const timeline = {
  name: 'Timeline',
  body: 'label-value-list',
  purpose: 'Describe milestones as labeled points in time.',
  example:
    '<Timeline>\n- July: Publish the manifest\n- August: Adopt it in validators\n</Timeline>',
  component: Timeline,
} satisfies HtmdxComponent;
