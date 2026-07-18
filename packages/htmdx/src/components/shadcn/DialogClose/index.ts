import type { HtmdxComponent } from '../../../component-definition';
import { DialogClose as Component } from './DialogClose';

export const DialogClose = {
  name: 'DialogClose',
  purpose: 'Control inside DialogContent that closes the dialog.',
  example:
    '<Dialog defaultOpen>\n  <DialogContent>\n    <DialogHeader>\n      <DialogTitle>Discard draft?</DialogTitle>\n      <DialogDescription>Your unsaved changes will be lost.</DialogDescription>\n    </DialogHeader>\n    <DialogFooter><DialogClose>Keep editing</DialogClose></DialogFooter>\n  </DialogContent>\n</Dialog>',
  body: 'htmdx',
  props: [
    {
      name: 'asChild',
      type: 'boolean',
      default: false,
      description:
        'Use the single child element as the close control instead of rendering a button.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
