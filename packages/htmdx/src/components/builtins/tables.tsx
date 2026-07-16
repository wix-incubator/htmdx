import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../shadcn/table';
import { parseComponentBody } from './body-contracts';
import { Block, Inline, rawBody, type RawBodyProps } from './shell';
import type { HtmdxComponent } from './types';

export const DataTable = rawBody(({ body = '' }: RawBodyProps) => {
  const table = parseComponentBody('DataTable', 'gfm-table', body);
  return (
    <Block name="DataTable">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {table.header.map((cell, index) => (
                <TableHead key={index}>
                  <Inline text={cell} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <Inline text={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Block>
  );
}, 'DataTable');

export const DecisionTable = rawBody(({ body = '' }: RawBodyProps) => {
  const items = parseComponentBody('DecisionTable', 'label-value-list', body);
  return (
    <Block name="DecisionTable">
      <div className="rounded-lg border">
        <Table>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableHead className="w-1/3 align-top">
                  <Inline text={item.label} />
                </TableHead>
                <TableCell className="whitespace-normal text-muted-foreground">
                  <Inline text={item.value} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Block>
  );
}, 'DecisionTable');

export const dataTable = {
  name: 'DataTable',
  body: 'gfm-table',
  purpose: 'Display structured records in rows and columns.',
  example:
    '<DataTable>\n| Plan | Users |\n| --- | ---: |\n| Free | 48 |\n| Pro | 12 |\n</DataTable>',
  component: DataTable,
} satisfies HtmdxComponent;

export const decisionTable = {
  name: 'DecisionTable',
  body: 'label-value-list',
  purpose: 'Present decision criteria and their corresponding outcomes.',
  example:
    '<DecisionTable>\n- Scope: Built-in components only\n- Delivery: Versioned manifest\n</DecisionTable>',
  component: DecisionTable,
} satisfies HtmdxComponent;
