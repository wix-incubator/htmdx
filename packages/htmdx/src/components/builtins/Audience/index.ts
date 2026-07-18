import type { HtmdxComponent } from '../../../component-definition';
import { Audience as Component } from './Audience';

export const Audience = {
  name: 'Audience',
  purpose:
    'Show target segments from one or more `- item` rows. Format each item as `**Persona — Type:** Description · metrics: value — caption; … · priority: High|Medium|Unmeasured`; Type is Primary, Secondary, or Secondary · Risk.',
  example:
    '<Audience>\n- **Self-Creator · Custom Goods Merchant — Primary:** Sells made-to-order products and needs a file from the shopper at purchase. · metrics: ~19.8K — stores above $50K GPV; 4.85% — of ~408K active stores · priority: High\n- **Partner / Freelancer — Secondary:** Hits the upload gap on every relevant client build. · priority: Medium\n</Audience>',
  body: 'markdown',
  Component,
} as const satisfies HtmdxComponent;
