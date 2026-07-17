import type { HtmdxComponent } from './types';

export const audience = {
  name: 'Audience',
  body: 'markdown-list-cards',
  purpose:
    'Target-audience segments: the Primary segment renders as a wide tinted hero card with a metric row, the rest as a secondary grid. Item title is `Persona — Type` (Type: Primary | Secondary | Secondary · Risk); the text is `Description · metrics: value — caption; … · priority: High|Medium|Unmeasured`.',
  example:
    '<Audience>\n- **Self-Creator · Custom Goods Merchant — Primary:** Sells made-to-order products and needs a file from the shopper at purchase. · metrics: ~19.8K — stores above $50K GPV; 4.85% — of ~408K active stores · priority: High\n- **Partner / Freelancer — Secondary:** Hits the upload gap on every relevant client build. · priority: Medium\n</Audience>',
} as const satisfies HtmdxComponent;
