import type { HtmdxComponent } from '../../../component-definition';
import { CollapsibleTrigger as Component } from './CollapsibleTrigger';

export const CollapsibleTrigger = {
  name: 'CollapsibleTrigger',
  purpose: 'Control that opens or closes the related CollapsibleContent.',
  example:
    '<Collapsible>\n  <CollapsibleTrigger>Toggle details</CollapsibleTrigger>\n  <CollapsibleContent>Supporting details.</CollapsibleContent>\n</Collapsible>',
  body: 'htmdx',
  props: [
    {
      name: 'asChild',
      type: 'boolean',
      default: false,
      description: 'Use the single child element as the trigger instead of rendering a button.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
