import type { HtmdxComponent } from '../../../component-definition';
import { HoverCardTrigger as Component } from './HoverCardTrigger';

export const HoverCardTrigger = {
  name: 'HoverCardTrigger',
  purpose: 'Control inside HoverCard whose pointer or focus state reveals HoverCardContent.',
  example:
    '<HoverCard>\n  <HoverCardTrigger>@htmdx</HoverCardTrigger>\n  <HoverCardContent>Editable artifact tools.</HoverCardContent>\n</HoverCard>',
  body: 'htmdx',
  props: [
    {
      name: 'asChild',
      type: 'boolean',
      default: false,
      description: 'Use the single child element as the trigger instead of rendering a link.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
