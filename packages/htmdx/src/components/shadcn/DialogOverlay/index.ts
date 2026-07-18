import type { HtmdxComponent } from '../../../component-definition';
import { DialogOverlay as Component } from './DialogOverlay';

export const DialogOverlay = {
  name: 'DialogOverlay',
  purpose: 'Bodyless backdrop layer for a custom DialogPortal; DialogContent already adds one.',
  example:
    '<Dialog defaultOpen>\n  <DialogPortal><DialogOverlay /></DialogPortal>\n  <DialogContent>\n    <DialogHeader>\n      <DialogTitle>Custom backdrop</DialogTitle>\n      <DialogDescription>This dialog also demonstrates its overlay layer.</DialogDescription>\n    </DialogHeader>\n  </DialogContent>\n</Dialog>',
  body: 'none',
  props: [
    {
      name: 'forceMount',
      type: 'boolean',
      default: false,
      description: 'Keep the overlay mounted even when the dialog is closed.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
