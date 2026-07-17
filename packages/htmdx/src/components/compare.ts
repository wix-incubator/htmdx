import type { HtmdxComponent } from './types';

export const compare = {
  name: 'Compare',
  body: 'markdown-list-cards',
  purpose: 'Place alternatives or contrasting concepts side by side.',
  example:
    '<Compare>\n- **Current:** Manual component discovery\n- **Proposed:** Versioned manifest\n</Compare>',
} as const satisfies HtmdxComponent;
