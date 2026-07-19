import { parseComponentBody } from '../../body-contracts';
import { Table } from '../../shadcn/Table/Table';
import { TableBody } from '../../shadcn/TableBody/TableBody';
import { TableCell } from '../../shadcn/TableCell/TableCell';
import { TableHead } from '../../shadcn/TableHead/TableHead';
import { TableHeader } from '../../shadcn/TableHeader/TableHeader';
import { TableRow } from '../../shadcn/TableRow/TableRow';
import { InlineMarkdown, StructuredBlock, type StructuredBodyProps } from '../shared/structured';

export function DataTable({ body = '', className, ...attributes }: StructuredBodyProps) {
  const table = parseComponentBody('DataTable', 'gfm-table', body);
  return (
    <StructuredBlock name="DataTable" className={className} {...attributes}>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {table.header.map((cell, index) => (
                <TableHead key={index}>
                  <InlineMarkdown text={cell} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <InlineMarkdown text={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </StructuredBlock>
  );
}
