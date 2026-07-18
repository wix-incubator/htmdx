import type { HtmdxComponent } from '../../../component-definition';
import { DialogHeader as Component } from './DialogHeader';

export const DialogHeader = {
  name: 'DialogHeader',
  purpose: 'Top section of DialogContent that groups its accessible title and description.',
  example:
    '<Dialog defaultOpen>\n  <DialogContent>\n    <DialogHeader>\n      <DialogTitle>Export data?</DialogTitle>\n      <DialogDescription>The export may take several minutes.</DialogDescription>\n    </DialogHeader>\n  </DialogContent>\n</Dialog>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
