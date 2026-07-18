import type { HtmdxComponent } from '../../../component-definition';
import { Table as Component } from './Table';

export const Table = {
  name: 'Table',
  purpose:
    'Responsive data table root; compose a caption, header, body, and optional footer inside it.',
  example:
    '<Table><TableCaption>Quarterly revenue</TableCaption><TableHeader><TableRow><TableHead scope="col">Plan</TableHead><TableHead scope="col">MRR</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Pro</TableCell><TableCell>$1,140</TableCell></TableRow></TableBody></Table>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
