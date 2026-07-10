import { BodyContractError, type MarkdownListCards } from './body-contracts';
import { componentShell, renderFeatureItem } from './rendering';
import type { HtmdxComponent } from './types';

export const riskTable: HtmdxComponent = {
  name: 'RiskTable',
  body: 'markdown-list-cards',
  purpose: 'Classify priorities using the canonical product-planning tiers.',
  example:
    '<RiskTable>\n- **Must-have:** Publish exact-version metadata.\n- **Not now:** Describe host components.\n</RiskTable>',
  renderer: renderRiskTable,
  validate: validateRiskTable,
};

function renderRiskTable(name: string, body: MarkdownListCards) {
  const items = body.items
    .map((item) => {
      const tierName = item.match(/^\*\*(Must-have|Differentiator|Not now|Won't do):?\*\*/)?.[1];
      const tier =
        tierName === 'Must-have'
          ? 'must-have'
          : tierName === 'Differentiator'
            ? 'differentiator'
            : tierName === 'Not now'
              ? 'not-now'
              : 'wont-do';
      return renderFeatureItem(item, tier);
    })
    .join('');

  return componentShell(name, `<div class="htmdx-feature-grid">${items}</div>`);
}

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
