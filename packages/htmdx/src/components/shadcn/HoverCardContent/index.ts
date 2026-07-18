import type { HtmdxComponent } from '../../../component-definition';
import { HoverCardContent as Component } from './HoverCardContent';

export const HoverCardContent = {
  name: 'HoverCardContent',
  purpose: 'Portalled rich preview surface positioned relative to its HoverCardTrigger.',
  example:
    '<HoverCard defaultOpen>\n  <HoverCardTrigger>@htmdx</HoverCardTrigger>\n  <HoverCardContent side="right" align="start">Build editable **HTML artifacts**.</HoverCardContent>\n</HoverCard>',
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
      description: 'Preferred side of the trigger.',
    },
    {
      name: 'sideOffset',
      type: 'number',
      default: 4,
      description: 'Distance in pixels from the trigger.',
    },
    {
      name: 'align',
      type: 'string',
      values: ['start', 'center', 'end'],
      default: 'center',
      description: 'Content alignment along the trigger.',
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
      description: 'How content stays aligned when the trigger leaves view.',
    },
    {
      name: 'hideWhenDetached',
      type: 'boolean',
      default: false,
      description: 'Hide content when its trigger is fully clipped.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
