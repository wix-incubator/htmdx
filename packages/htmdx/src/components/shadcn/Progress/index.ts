import type { HtmdxComponent } from '../../../component-definition';
import { Progress as Component } from './Progress';

export const Progress = {
  name: 'Progress',
  purpose: 'Displays determinate progress from 0 to 100.',
  example: '<Progress value="60" />',
  body: 'none',
  props: [
    {
      name: 'value',
      type: 'number',
      min: 0,
      max: 100,
      default: 0,
      description: 'Completed percentage from 0 to 100.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
