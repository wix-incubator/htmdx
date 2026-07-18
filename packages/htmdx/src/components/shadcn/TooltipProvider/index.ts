import type { HtmdxComponent } from '../../../component-definition';
import { TooltipProvider as Component } from './TooltipProvider';

export const TooltipProvider = {
  name: 'TooltipProvider',
  purpose: 'Shared timing and pointer-behavior settings for one or more nested Tooltip components.',
  example:
    '<TooltipProvider delayDuration="200" skipDelayDuration="100">\n  <Tooltip>\n    <TooltipTrigger>Report status</TooltipTrigger>\n    <TooltipContent>Published yesterday</TooltipContent>\n  </Tooltip>\n</TooltipProvider>',
  body: 'htmdx',
  props: [
    {
      name: 'delayDuration',
      type: 'number',
      default: 0,
      min: 0,
      description: 'Milliseconds to wait before opening a tooltip.',
    },
    {
      name: 'skipDelayDuration',
      type: 'number',
      default: 300,
      min: 0,
      description: 'Grace period for moving between tooltip triggers without another delay.',
    },
    {
      name: 'disableHoverableContent',
      type: 'boolean',
      default: false,
      description:
        'Close when the pointer leaves a trigger instead of allowing hover over content.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
