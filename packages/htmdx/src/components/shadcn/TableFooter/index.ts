import type { HtmdxComponent } from '../../../component-definition';
import { TableFooter as Component } from './TableFooter';

export const TableFooter = {
  name: 'TableFooter',
  purpose: 'Footer section of a Table for totals or summary rows.',
  example:
    '<Table><TableBody><TableRow><TableCell>Pro</TableCell><TableCell>$1,140</TableCell></TableRow></TableBody><TableFooter><TableRow><TableCell>Total</TableCell><TableCell>$1,140</TableCell></TableRow></TableFooter></Table>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
