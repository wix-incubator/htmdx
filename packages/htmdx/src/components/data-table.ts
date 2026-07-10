import type { GfmTable } from './body-contracts';
import { componentShell, inline } from './rendering';
import type { HtmdxComponent } from './types';

export const dataTable: HtmdxComponent = {
  name: 'DataTable',
  body: 'gfm-table',
  purpose: 'Display structured records in rows and columns.',
  example:
    '<DataTable>\n| Plan | Users |\n| --- | ---: |\n| Free | 48 |\n| Pro | 12 |\n</DataTable>',
  renderer: renderDataTable,
};

function renderDataTable(name: string, body: GfmTable) {
  const header = body.header.map((cell) => `<th>${inline(cell)}</th>`).join('');
  const rows = body.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`)
    .join('');

  return componentShell(
    name,
    `<table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`,
  );
}
