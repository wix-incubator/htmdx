import type { HtmdxComponent } from '../../../component-definition';
import { CollapsibleContent as Component } from './CollapsibleContent';

export const CollapsibleContent = {
  name: 'CollapsibleContent',
  purpose: 'Content shown while its Collapsible region is open.',
  example:
    '<Collapsible defaultOpen>\n  <CollapsibleTrigger>Toggle details</CollapsibleTrigger>\n  <CollapsibleContent>Supporting **details**.</CollapsibleContent>\n</Collapsible>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
