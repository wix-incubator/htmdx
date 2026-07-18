import type { HtmdxComponent } from '../../../component-definition';
import { DialogPortal as Component } from './DialogPortal';

export const DialogPortal = {
  name: 'DialogPortal',
  purpose: 'Moves custom Dialog layers to the document body; DialogContent already uses one.',
  example:
    '<Dialog defaultOpen>\n  <DialogPortal><DialogOverlay /></DialogPortal>\n  <DialogContent>\n    <DialogHeader>\n      <DialogTitle>Portalled dialog</DialogTitle>\n      <DialogDescription>The modal layers render outside the source host.</DialogDescription>\n    </DialogHeader>\n  </DialogContent>\n</Dialog>',
  body: 'htmdx',
  props: [
    {
      name: 'forceMount',
      type: 'boolean',
      default: false,
      description: 'Keep the portal children mounted even when the dialog is closed.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
