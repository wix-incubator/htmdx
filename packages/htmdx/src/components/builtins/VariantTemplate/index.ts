import type { HtmdxComponent } from '../../../component-definition';
import { variantsExample } from '../shared/variants-example';
import { VariantTemplate as Component } from './VariantTemplate';

export const VariantTemplate = {
  name: 'VariantTemplate',
  purpose:
    'The component the variants are drawn in, written once in HTML with inline styles and a TextSlot for every piece of text. It ignores the page’s own typography and Tailwind classes, so it renders like the product. Give a second template a name when a variant proposes a different component.',
  example: variantsExample,
  body: 'htmdx',
  props: [
    {
      name: 'name',
      type: 'string',
      description: 'Names an alternative template for Variant template. Omit for the main one.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
