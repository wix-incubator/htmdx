import type { HtmdxComponent } from '../../../component-definition';
import { TableHeader as Component } from './TableHeader';

export const TableHeader = {
  name: 'TableHeader',
  purpose: 'Header section of a Table; place rows of TableHead cells inside it.',
  example:
    '<Table><TableHeader><TableRow><TableHead scope="col">Plan</TableHead><TableHead scope="col">MRR</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Pro</TableCell><TableCell>$1,140</TableCell></TableRow></TableBody></Table>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
