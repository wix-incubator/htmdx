import type { HtmdxComponent } from '../../../component-definition';
import { DialogContent as Component } from './DialogContent';

export const DialogContent = {
  name: 'DialogContent',
  purpose:
    'Portalled modal surface; include a DialogTitle and DialogDescription for accessibility.',
  example:
    '<Dialog defaultOpen>\n  <DialogContent showCloseButton="true">\n    <DialogHeader>\n      <DialogTitle>Publish report?</DialogTitle>\n      <DialogDescription>The report will become visible to the team.</DialogDescription>\n    </DialogHeader>\n    <DialogFooter><DialogClose>Cancel</DialogClose></DialogFooter>\n  </DialogContent>\n</Dialog>',
  body: 'htmdx',
  props: [
    {
      name: 'showCloseButton',
      type: 'boolean',
      default: true,
      description: 'Whether to show the icon close control in the top corner.',
    },
    {
      name: 'forceMount',
      type: 'boolean',
      default: false,
      description: 'Keep the content mounted even when the dialog is closed.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
