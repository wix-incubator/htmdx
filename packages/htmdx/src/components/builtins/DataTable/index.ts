import type { HtmdxComponent } from '../../../component-definition';
import { DataTable as Component } from './DataTable';

export const DataTable = {
  name: 'DataTable',
  body: 'markdown',
  purpose:
    'Display structured records written as a GFM table with a non-empty header, separator row, and at least one consistently sized data row.',
  example:
    '<DataTable>\n| Plan | Users |\n| --- | ---: |\n| Free | 48 |\n| Pro | 12 |\n</DataTable>',
  Component,
} as const satisfies HtmdxComponent;
