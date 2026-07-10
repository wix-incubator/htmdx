import { renderListCards } from './renderers';
import type { HtmdxComponent } from './types';

export const evidence: HtmdxComponent = {
  name: 'Evidence',
  body: 'markdown-list-cards',
  purpose: 'List evidence that supports the surrounding analysis.',
  example:
    '<Evidence>\n- **Runtime:** The allowlist currently lives in implementation code.\n</Evidence>',
  renderer: renderListCards,
};
