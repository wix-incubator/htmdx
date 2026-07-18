import type { HtmdxComponent } from '../../../component-definition';
import { PopoverTrigger as Component } from './PopoverTrigger';

export const PopoverTrigger = {
  name: 'PopoverTrigger',
  purpose: 'Control inside Popover that opens or closes PopoverContent.',
  example:
    '<Popover>\n  <PopoverTrigger>Open filters</PopoverTrigger>\n  <PopoverContent>Choose the report filters.</PopoverContent>\n</Popover>',
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
