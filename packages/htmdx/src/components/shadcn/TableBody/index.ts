import type { HtmdxComponent } from '../../../component-definition';
import { TableBody as Component } from './TableBody';

export const TableBody = {
  name: 'TableBody',
  purpose: 'Body section of a Table; place data TableRow elements inside it.',
  example:
    '<Table><TableHeader><TableRow><TableHead scope="col">Plan</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Pro</TableCell></TableRow></TableBody></Table>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
