import type { HtmdxComponent } from '../../../component-definition';
import { Separator as Component } from './Separator';

export const Separator = {
  name: 'Separator',
  purpose: 'Draws a horizontal or vertical rule between sections.',
  example: '<Separator orientation="horizontal" />',
  body: 'none',
  props: [
    {
      name: 'orientation',
      type: 'string',
      values: ['horizontal', 'vertical'],
      default: 'horizontal',
      description: 'Direction of the dividing rule.',
    },
    {
      name: 'decorative',
      type: 'boolean',
      default: true,
      description: 'Whether assistive tools should ignore the separator.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
