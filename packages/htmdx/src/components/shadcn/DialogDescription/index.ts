import type { HtmdxComponent } from '../../../component-definition';
import { DialogDescription as Component } from './DialogDescription';

export const DialogDescription = {
  name: 'DialogDescription',
  purpose: 'Accessible description that explains a DialogContent surface.',
  example:
    '<Dialog defaultOpen>\n  <DialogContent>\n    <DialogHeader>\n      <DialogTitle>Archive report?</DialogTitle>\n      <DialogDescription>The report will move to the archive.</DialogDescription>\n    </DialogHeader>\n  </DialogContent>\n</Dialog>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
