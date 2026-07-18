import type { HtmdxComponent } from '../../../component-definition';
import { Collapsible as Component } from './Collapsible';

export const Collapsible = {
  name: 'Collapsible',
  purpose: 'Single expandable region controlled by a CollapsibleTrigger.',
  example:
    '<Collapsible defaultOpen>\n  <CollapsibleTrigger>Toggle details</CollapsibleTrigger>\n  <CollapsibleContent>Supporting details.</CollapsibleContent>\n</Collapsible>',
  body: 'htmdx',
  props: [
    {
      name: 'defaultOpen',
      type: 'boolean',
      default: false,
      description: 'Whether the region starts open.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
