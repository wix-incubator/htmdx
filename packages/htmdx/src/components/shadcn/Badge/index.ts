import type { HtmdxComponent } from '../../../component-definition';
import { Badge as Component } from './Badge';

export const Badge = {
  name: 'Badge',
  purpose: 'Small status or label chip.',
  example: '<Badge variant="secondary">audited</Badge>',
  body: 'htmdx',
  props: [
    {
      name: 'variant',
      type: 'string',
      values: ['default', 'secondary', 'destructive', 'outline'],
      default: 'default',
      description: 'Visual emphasis of the chip.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
