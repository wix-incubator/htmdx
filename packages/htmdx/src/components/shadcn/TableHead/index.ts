import type { HtmdxComponent } from '../../../component-definition';
import { TableHead as Component } from './TableHead';

export const TableHead = {
  name: 'TableHead',
  purpose: 'Header cell inside a TableRow; use scope to link it to its row, column, or group.',
  example:
    '<Table><TableHeader><TableRow><TableHead scope="col" abbr="Plan name">Plan</TableHead><TableHead scope="col">MRR</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Pro</TableCell><TableCell>$1,140</TableCell></TableRow></TableBody></Table>',
  body: 'htmdx',
  props: [
    {
      name: 'colSpan',
      type: 'number',
      min: 1,
      max: 1000,
      description: 'Number of columns this header cell spans.',
    },
    {
      name: 'rowSpan',
      type: 'number',
      min: 0,
      max: 65534,
      description:
        'Number of rows this header cell spans; 0 spans all remaining rows in the section.',
    },
    {
      name: 'scope',
      type: 'string',
      values: ['row', 'col', 'rowgroup', 'colgroup'],
      description: 'Cells this header labels.',
    },
    {
      name: 'abbr',
      type: 'string',
      description: 'Short form of the header label.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
