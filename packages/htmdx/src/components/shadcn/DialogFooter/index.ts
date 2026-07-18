import type { HtmdxComponent } from '../../../component-definition';
import { DialogFooter as Component } from './DialogFooter';

export const DialogFooter = {
  name: 'DialogFooter',
  purpose: 'Bottom action section of DialogContent with an optional built-in close button.',
  example:
    '<Dialog defaultOpen>\n  <DialogContent>\n    <DialogHeader>\n      <DialogTitle>Save changes?</DialogTitle>\n      <DialogDescription>Confirm whether to keep your edits.</DialogDescription>\n    </DialogHeader>\n    <DialogFooter showCloseButton="true"><Button>Save</Button></DialogFooter>\n  </DialogContent>\n</Dialog>',
  body: 'htmdx',
  props: [
    {
      name: 'showCloseButton',
      type: 'boolean',
      default: false,
      description: 'Whether to append an outline close button.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
