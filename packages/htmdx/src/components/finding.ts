import type { MarkdownListCards } from './body-contracts';
import { componentShell, renderFeatureCardsContent } from './rendering';
import type { HtmdxComponent } from './types';

export const finding: HtmdxComponent = {
  name: 'Finding',
  body: 'markdown-list-cards',
  purpose: 'Present key findings as a scannable list.',
  example: '<Finding>\n- **Drift:** Runtime support is not machine-discoverable.\n</Finding>',
  renderer: renderFinding,
};

function renderFinding(name: string, body: MarkdownListCards) {
  return componentShell(name, renderFeatureCardsContent(body));
}
