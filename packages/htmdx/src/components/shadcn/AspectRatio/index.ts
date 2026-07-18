import type { HtmdxComponent } from '../../../component-definition';
import { AspectRatio as Component } from './AspectRatio';

export const AspectRatio = {
  name: 'AspectRatio',
  purpose: 'Keeps nested media at a fixed width-to-height ratio.',
  example:
    '<AspectRatio ratio="1.7778">\n  <img src="https://images.unsplash.com/photo-1535025183041-0991a977e25b" alt="Mountain landscape" />\n</AspectRatio>',
  body: 'htmdx',
  props: [
    {
      name: 'ratio',
      type: 'number',
      min: Number.MIN_VALUE,
      default: 1,
      description: 'Width divided by height; use a positive number such as 1.7778 for 16:9.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
