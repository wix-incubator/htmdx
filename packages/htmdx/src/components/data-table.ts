import type { HtmdxComponent } from './types';

export const dataTable: HtmdxComponent = {
  name: 'DataTable',
  body: 'gfm-table',
  purpose: 'Display structured records in rows and columns.',
  example:
    '<DataTable>\n| Plan | Users |\n| --- | ---: |\n| Free | 48 |\n| Pro | 12 |\n</DataTable>',
};
