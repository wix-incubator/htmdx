import { cva } from 'class-variance-authority';
import {
  BodyContractError,
  parseComponentBody,
  type MarkdownListCards,
} from '../../body-contracts';
import {
  InlineMarkdown,
  splitFeature,
  StructuredBlock,
  type StructuredBodyProps,
} from '../shared/structured';

const RISK_TIERS = ['Must-have', 'Differentiator', 'Not now', "Won't do"] as const;

function validateRiskTable(body: MarkdownListCards) {
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

export function RiskTable({ body = '', className, ...attributes }: StructuredBodyProps) {
  const parsed = parseComponentBody('RiskTable', 'markdown-list-cards', body, validateRiskTable);
  return (
    <StructuredBlock name="RiskTable" className={className} {...attributes}>
      <div className="flex flex-col gap-2">
        {parsed.items.map((item, index) => {
          const tier = tierOf(item);
          const { text } = splitFeature(item);
          return (
            <div key={index} className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <span className={tierBadge({ tier })}>{TIER_LABEL[tier]}</span>
              <span className="text-sm text-muted-foreground">
                <InlineMarkdown text={text} />
              </span>
            </div>
          );
        })}
      </div>
    </StructuredBlock>
  );
}
