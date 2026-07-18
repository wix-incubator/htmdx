import type { HtmdxComponent } from '../../../component-definition';
import { TableCaption as Component } from './TableCaption';

export const TableCaption = {
  name: 'TableCaption',
  purpose: 'Accessible caption that names or describes its containing Table.',
  example:
    '<Table><TableCaption>Quarterly revenue by plan</TableCaption><TableBody><TableRow><TableCell>Pro</TableCell></TableRow></TableBody></Table>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
