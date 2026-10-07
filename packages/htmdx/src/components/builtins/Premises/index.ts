import type { HtmdxComponent } from '../../../component-definition';
import { Premises as Component } from './Premises';

export const Premises = {
  name: 'Premises',
  purpose:
    'What a piece of work understood its subject to be, and what it took as true, as two cards so a wrong premise is caught before the rest is read. `- **Label:** value` rows are facts; other `- rows` are assumptions, with indented `- point` rows under a claim that contains a list.',
  example:
    '<Premises>\n- **What it is:** Merchants can tag products with a brand, and shoppers can filter by it.\n- **Audience:** Every Wix Stores merchant, from a first store to an agency.\n- Brands are created from the Products page.\n- "Brand" stays lowercase mid-sentence:\n  - in the filter panel\n  - in product cards\n</Premises>',
  body: 'markdown',
  props: [
    {
      name: 'title',
      type: 'string',
      default: 'About this feature',
      description: 'Heading of the facts card.',
    },
    {
      name: 'assumptionsTitle',
      type: 'string',
      default: 'Assumptions',
      description: 'Heading of the assumptions card.',
    },
    {
      name: 'note',
      type: 'string',
      description:
        'One line under the assumptions heading: where they came from, and to say so if one is wrong.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
