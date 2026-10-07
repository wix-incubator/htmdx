import type { HtmdxComponent } from '../../../component-definition';
import { variantsExample } from '../shared/variants-example';
import { Variant as Component } from './Variant';

export const Variant = {
  name: 'Variant',
  purpose:
    'The text of one variant inside Variants, as \'- slot: text\' rows matching the template’s TextSlot names. The first, current="true", is today’s text; the rest are numbered Version 1, 2, … in order. A slot a variant leaves out keeps the current text.',
  example: variantsExample,
  body: 'markdown',
  props: [
    { name: 'current', type: 'boolean', default: false, description: 'Marks today’s text.' },
    {
      name: 'label',
      type: 'string',
      description: 'The variant’s angle in 2-3 words, without a number.',
    },
    {
      name: 'why',
      type: 'string',
      description:
        'Why this variant. Inline Markdown; the first sentence shows, the rest folds under Read more.',
    },
    { name: 'assumptions', type: 'json', description: 'What this variant takes as true: ["..."].' },
    {
      name: 'sourced',
      type: 'string',
      description:
        'Where text the current variant never said came from, so a fact that was looked up reads differently from one that was invented.',
    },
    {
      name: 'template',
      type: 'string',
      description:
        'Name of another VariantTemplate, when this variant proposes a different component. Its slots are not diffed.',
    },
    {
      name: 'badge',
      type: 'string',
      description: 'A short tag after the label, e.g. "Updated".',
    },
    {
      name: 'badgeTip',
      type: 'string',
      description: 'Tooltip for the badge: what it means for this variant.',
    },
    {
      name: 'overrides',
      type: 'json',
      description:
        'Slot text that replaces the rows, e.g. a reader’s own wording: {"cta":"Add your first brand"}. Rendered as plain text.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
