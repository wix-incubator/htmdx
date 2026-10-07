import type { HtmdxComponent } from '../../../component-definition';
import { variantsExample } from '../shared/variants-example';
import { Variants as Component } from './Variants';

export const Variants = {
  name: 'Variants',
  purpose:
    'Compare versions of one piece of UI: a VariantTemplate drawn once per Variant with that variant’s text, each word-diffed against the current one, with its Why, assumptions and sources. A chosen variant moves under the current one and the rest fold away.',
  example: variantsExample,
  body: 'htmdx',
  props: [
    {
      name: 'name',
      type: 'string',
      description: 'What the variants are of, e.g. "Empty state". Names them for extensions.',
    },
    {
      name: 'chosen',
      type: 'string',
      pattern: '^(current|[1-9][0-9]*)$',
      description: 'The variant settled on: its number, as in "Version 2", or "current".',
    },
    {
      name: 'chosenLabel',
      type: 'string',
      default: 'Chosen',
      description: 'The tag on the chosen variant.',
    },
    {
      name: 'flag',
      type: 'string',
      description: 'A gap the text alone cannot fix, pinned on the current variant.',
    },
    {
      name: 'flagAnchor',
      type: 'string',
      description:
        'The TextSlot name the flag points at. Omit when it is about the whole component.',
    },
    { name: 'flagLabel', type: 'string', default: 'Flag', description: 'The flag’s heading.' },
  ],
  Component,
} as const satisfies HtmdxComponent;
