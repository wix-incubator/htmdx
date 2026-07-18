import type { HtmdxComponent } from '../../../component-definition';
import { Popover as Component } from './Popover';

export const Popover = {
  name: 'Popover',
  purpose: 'State container for a control and a floating panel shown on demand.',
  example:
    '<Popover>\n  <PopoverTrigger>Open filters</PopoverTrigger>\n  <PopoverContent>Choose the report filters.</PopoverContent>\n</Popover>',
  body: 'htmdx',
  props: [
    {
      name: 'defaultOpen',
      type: 'boolean',
      default: false,
      description: 'Whether the popover starts open.',
    },
    {
      name: 'modal',
      type: 'boolean',
      default: false,
      description: 'Whether open content blocks interaction outside it.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
