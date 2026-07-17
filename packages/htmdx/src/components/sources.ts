import type { HtmdxComponent } from './types';

export const sources = {
  name: 'Sources',
  body: 'markdown-list-cards',
  purpose:
    'Show the research artifacts a section draws on as a row of provenance pills (each prefixed with ↗). A **bold** item renders as the highlighted current-artifact pill.',
  example: '<Sources>\n- Data Analysis\n- User Voice\n- **Product Strategy**\n</Sources>',
} as const satisfies HtmdxComponent;
