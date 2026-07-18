import type { HtmdxComponent } from '../../../component-definition';
import { PopoverContent as Component } from './PopoverContent';

export const PopoverContent = {
  name: 'PopoverContent',
  purpose: 'Portalled floating panel positioned relative to a PopoverTrigger or PopoverAnchor.',
  example:
    '<Popover defaultOpen>\n  <PopoverTrigger>Open filters</PopoverTrigger>\n  <PopoverContent side="bottom" align="start">Choose the **report filters**.</PopoverContent>\n</Popover>',
  body: 'htmdx',
  props: [
    {
      name: 'forceMount',
      type: 'boolean',
      default: false,
      description: 'Keep the content mounted when closed.',
    },
    {
      name: 'side',
      type: 'string',
      values: ['top', 'right', 'bottom', 'left'],
      default: 'bottom',
      description: 'Preferred side of the anchor.',
    },
    {
      name: 'sideOffset',
      type: 'number',
      default: 4,
      description: 'Distance in pixels from the anchor.',
    },
    {
      name: 'align',
      type: 'string',
      values: ['start', 'center', 'end'],
      default: 'center',
      description: 'Content alignment along the anchor.',
    },
    { name: 'alignOffset', type: 'number', default: 0, description: 'Alignment shift in pixels.' },
    {
      name: 'avoidCollisions',
      type: 'boolean',
      default: true,
      description: 'Shift or flip content to keep it in view.',
    },
    {
      name: 'collisionPadding',
      type: 'number',
      default: 0,
      min: 0,
      description: 'Viewport edge padding in pixels.',
    },
    {
      name: 'sticky',
      type: 'string',
      values: ['partial', 'always'],
      default: 'partial',
      description: 'How content stays aligned when the anchor leaves view.',
    },
    {
      name: 'hideWhenDetached',
      type: 'boolean',
      default: false,
      description: 'Hide content when its anchor is fully clipped.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
