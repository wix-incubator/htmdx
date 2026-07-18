import type { HtmdxComponent } from '../../../component-definition';
import { PopoverAnchor as Component } from './PopoverAnchor';

export const PopoverAnchor = {
  name: 'PopoverAnchor',
  purpose: 'Optional element inside Popover used as the positioning anchor for PopoverContent.',
  example:
    '<Popover defaultOpen>\n  <PopoverAnchor>Report filters</PopoverAnchor>\n  <PopoverContent>Choose the report filters.</PopoverContent>\n</Popover>',
  body: 'htmdx',
  props: [
    {
      name: 'asChild',
      type: 'boolean',
      default: false,
      description: 'Use the single child element as the anchor instead of rendering a wrapper.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
