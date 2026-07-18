import type { HtmdxComponent } from '../../../component-definition';
import { TableCell as Component } from './TableCell';

export const TableCell = {
  name: 'TableCell',
  purpose: 'Data cell inside a TableRow; use spans to cover more than one row or column.',
  example:
    '<Table><TableHeader><TableRow><TableHead id="plan" scope="col">Plan</TableHead><TableHead scope="col">Status</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell headers="plan">Pro</TableCell><TableCell rowSpan="2">Active</TableCell></TableRow><TableRow><TableCell headers="plan">Business</TableCell></TableRow></TableBody></Table>',
  body: 'htmdx',
  props: [
    {
      name: 'colSpan',
      type: 'number',
      min: 1,
      max: 1000,
      description: 'Number of columns this cell spans.',
    },
    {
      name: 'rowSpan',
      type: 'number',
      min: 0,
      max: 65534,
      description: 'Number of rows this cell spans; 0 spans all remaining rows in the section.',
    },
    {
      name: 'headers',
      type: 'string',
      description: 'Space-separated ids of TableHead cells that label this cell.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
