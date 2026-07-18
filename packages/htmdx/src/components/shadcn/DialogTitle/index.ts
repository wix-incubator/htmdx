import type { HtmdxComponent } from '../../../component-definition';
import { DialogTitle as Component } from './DialogTitle';

export const DialogTitle = {
  name: 'DialogTitle',
  purpose: 'Required accessible name for a DialogContent surface.',
  example:
    '<Dialog defaultOpen>\n  <DialogContent>\n    <DialogHeader>\n      <DialogTitle>Delete workspace?</DialogTitle>\n      <DialogDescription>This action cannot be undone.</DialogDescription>\n    </DialogHeader>\n  </DialogContent>\n</Dialog>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
