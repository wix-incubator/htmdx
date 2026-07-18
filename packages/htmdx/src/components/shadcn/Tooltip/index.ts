import type { HtmdxComponent } from '../../../component-definition';
import { Tooltip as Component } from './Tooltip';

export const Tooltip = {
  name: 'Tooltip',
  purpose:
    'State container for a control and a short text label; includes standalone provider wiring.',
  example:
    '<Tooltip>\n  <TooltipTrigger>Report status</TooltipTrigger>\n  <TooltipContent>Published yesterday</TooltipContent>\n</Tooltip>',
  body: 'htmdx',
  props: [
    {
      name: 'defaultOpen',
      type: 'boolean',
      default: false,
      description: 'Whether the tooltip starts open.',
    },
    {
      name: 'delayDuration',
      type: 'number',
      default: 0,
      min: 0,
      description: 'Milliseconds to wait before opening this tooltip.',
    },
    {
      name: 'disableHoverableContent',
      type: 'boolean',
      default: false,
      description:
        'Close when the pointer leaves the trigger instead of allowing hover over content.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
