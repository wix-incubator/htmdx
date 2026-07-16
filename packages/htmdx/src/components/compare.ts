import type { HtmdxComponent } from './types';

export const compare: HtmdxComponent = {
  name: 'Compare',
  body: 'markdown-list-cards',
  purpose: 'Place alternatives or contrasting concepts side by side.',
  example:
    '<Compare>\n- **Current:** Manual component discovery\n- **Proposed:** Versioned manifest\n</Compare>',
};
