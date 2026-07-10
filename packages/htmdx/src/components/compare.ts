import type { MarkdownListCards } from './body-contracts';
import { componentShell, renderFeatureCardsContent } from './rendering';
import type { HtmdxComponent } from './types';

export const compare: HtmdxComponent = {
  name: 'Compare',
  body: 'markdown-list-cards',
  purpose: 'Place alternatives or contrasting concepts side by side.',
  example:
    '<Compare>\n- **Current:** Manual component discovery\n- **Proposed:** Versioned manifest\n</Compare>',
  renderer: renderCompare,
};

function renderCompare(name: string, body: MarkdownListCards) {
  return componentShell(name, renderFeatureCardsContent(body));
}
