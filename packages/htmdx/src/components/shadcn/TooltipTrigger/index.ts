import type { HtmdxComponent } from '../../../component-definition';
import { TooltipTrigger as Component } from './TooltipTrigger';

export const TooltipTrigger = {
  name: 'TooltipTrigger',
  purpose: 'Control inside Tooltip whose pointer or focus state reveals TooltipContent.',
  example:
    '<Tooltip>\n  <TooltipTrigger>Report status</TooltipTrigger>\n  <TooltipContent>Published yesterday</TooltipContent>\n</Tooltip>',
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
