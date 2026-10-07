import type { HtmdxComponent } from '../../../component-definition';
import { variantsExample } from '../shared/variants-example';
import { TextSlot as Component } from './TextSlot';

export const TextSlot = {
  name: 'TextSlot',
  purpose:
    'One piece of text inside a VariantTemplate, filled from each Variant row of the same name and word-diffed against the current variant. Name it for what it is: title, body, cta.',
  example: variantsExample,
  body: 'none',
  props: [
    {
      name: 'name',
      type: 'string',
      required: true,
      pattern: '^[A-Za-z][A-Za-z0-9_-]*$',
      description: 'Matches a row name in each Variant.',
    },
    {
      name: 'href',
      type: 'string',
      pattern: '^[A-Za-z][A-Za-z0-9_-]*$',
      description:
        'Name of another slot that holds a URL. The text becomes a link to it, so each variant can point somewhere else.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
