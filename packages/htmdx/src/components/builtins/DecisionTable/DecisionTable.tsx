import { parseComponentBody } from '../../body-contracts';
import { Table } from '../../shadcn/Table/Table';
import { TableBody } from '../../shadcn/TableBody/TableBody';
import { TableCell } from '../../shadcn/TableCell/TableCell';
import { TableHead } from '../../shadcn/TableHead/TableHead';
import { TableRow } from '../../shadcn/TableRow/TableRow';
import { InlineMarkdown, StructuredBlock, type StructuredBodyProps } from '../shared/structured';

export function DecisionTable({ body = '', className, ...attributes }: StructuredBodyProps) {
  const items = parseComponentBody('DecisionTable', 'label-value-list', body);
  return (
    <StructuredBlock name="DecisionTable" className={className} {...attributes}>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableHead className="w-1/3 align-middle">
                  <InlineMarkdown text={item.label} />
                </TableHead>
                <TableCell className="align-middle whitespace-normal text-muted-foreground">
                  <InlineMarkdown text={item.value} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </StructuredBlock>
  );
}
