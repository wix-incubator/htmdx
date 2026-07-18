import type { HtmdxComponent } from '../../../component-definition';
import { Button as Component } from './Button';

export const Button = {
  name: 'Button',
  purpose: 'Button-styled label for display-only artifact actions.',
  example: '<Button variant="outline" size="sm">Download</Button>',
  body: 'htmdx',
  props: [
    {
      name: 'variant',
      type: 'string',
      values: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      default: 'default',
      description: 'Visual emphasis of the button.',
    },
    {
      name: 'size',
      type: 'string',
      values: ['default', 'sm', 'lg', 'icon'],
      default: 'default',
      description: 'Button height and padding preset.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
