import type { HtmdxComponent } from '../../../component-definition';
import { HoverCard as Component } from './HoverCard';

export const HoverCard = {
  name: 'HoverCard',
  purpose: 'State container for a trigger and a rich preview card shown after a pointer pause.',
  example:
    '<HoverCard openDelay="300" closeDelay="200">\n  <HoverCardTrigger>@htmdx</HoverCardTrigger>\n  <HoverCardContent>Build editable **HTML artifacts**.</HoverCardContent>\n</HoverCard>',
  body: 'htmdx',
  props: [
    {
      name: 'defaultOpen',
      type: 'boolean',
      default: false,
      description: 'Whether the card starts open.',
    },
    {
      name: 'openDelay',
      type: 'number',
      default: 700,
      min: 0,
      description: 'Milliseconds to wait before opening.',
    },
    {
      name: 'closeDelay',
      type: 'number',
      default: 300,
      min: 0,
      description: 'Milliseconds to wait before closing.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
