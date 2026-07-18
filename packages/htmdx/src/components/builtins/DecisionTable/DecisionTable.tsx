import { parseComponentBody } from '../../body-contracts';
import { Table, TableBody, TableCell, TableHead, TableRow } from '../../../react/shadcn/table';
import { InlineMarkdown, StructuredBlock, type StructuredBodyProps } from '../shared/structured';

export function DecisionTable({ body = '', className, ...attributes }: StructuredBodyProps) {
  const items = parseComponentBody('DecisionTable', 'label-value-list', body);
  return (
    <StructuredBlock name="DecisionTable" className={className} {...attributes}>
      <div className="rounded-lg border">
        <Table>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableHead className="w-1/3 align-top">
                  <InlineMarkdown text={item.label} />
                </TableHead>
                <TableCell className="whitespace-normal text-muted-foreground">
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
