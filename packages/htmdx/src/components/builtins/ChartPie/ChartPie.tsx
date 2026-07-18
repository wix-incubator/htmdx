import { parseComponentBody } from '../../body-contracts';
import { ChartVisualization } from '../shared/charts';
import { StructuredBlock, type StructuredBodyProps } from '../shared/structured';

export function ChartPie({ body = '', className, ...attributes }: StructuredBodyProps) {
  const data = parseComponentBody('ChartPie', 'label-number-list', body);
  return (
    <StructuredBlock name="ChartPie" className={className} {...attributes}>
      <ChartVisualization name="ChartPie" data={data} />
    </StructuredBlock>
  );
}
