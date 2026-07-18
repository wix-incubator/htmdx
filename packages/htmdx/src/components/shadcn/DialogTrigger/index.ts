import type { HtmdxComponent } from '../../../component-definition';
import { DialogTrigger as Component } from './DialogTrigger';

export const DialogTrigger = {
  name: 'DialogTrigger',
  purpose: 'Control inside Dialog that opens its dialog content.',
  example:
    '<Dialog>\n  <DialogTrigger>Open migration review</DialogTrigger>\n  <DialogContent>\n    <DialogHeader>\n      <DialogTitle>Migration review</DialogTitle>\n      <DialogDescription>Check the planned changes.</DialogDescription>\n    </DialogHeader>\n  </DialogContent>\n</Dialog>',
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
