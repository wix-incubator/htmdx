import type { HtmdxComponent } from '../../../component-definition';
import { Dialog as Component } from './Dialog';

export const Dialog = {
  name: 'Dialog',
  purpose: 'Modal state container for a trigger and accessible dialog content.',
  example:
    '<Dialog>\n  <DialogTrigger>Open dialog</DialogTrigger>\n  <DialogContent>\n    <DialogHeader>\n      <DialogTitle>Confirm migration</DialogTitle>\n      <DialogDescription>Review the migration before continuing.</DialogDescription>\n    </DialogHeader>\n    <DialogFooter><DialogClose>Cancel</DialogClose></DialogFooter>\n  </DialogContent>\n</Dialog>',
  body: 'htmdx',
  props: [
    {
      name: 'defaultOpen',
      type: 'boolean',
      default: false,
      description: 'Whether the dialog starts open.',
    },
    {
      name: 'modal',
      type: 'boolean',
      default: true,
      description: 'Whether the dialog blocks interaction with content outside it.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
