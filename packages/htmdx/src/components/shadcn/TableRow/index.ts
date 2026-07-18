import type { HtmdxComponent } from '../../../component-definition';
import { TableRow as Component } from './TableRow';

export const TableRow = {
  name: 'TableRow',
  purpose:
    'One row inside a TableHeader, TableBody, or TableFooter; fill it with matching cell tags.',
  example:
    '<Table><TableBody><TableRow><TableCell>Pro</TableCell><TableCell>$1,140</TableCell></TableRow></TableBody></Table>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
