import { parseComponentBody } from '../../body-contracts';
import { ChartVisualization } from '../shared/charts';
import { StructuredBlock, type StructuredBodyProps } from '../shared/structured';

export function ChartArea({ body = '', className, ...attributes }: StructuredBodyProps) {
  const data = parseComponentBody('ChartArea', 'label-number-list', body);
  return (
    <StructuredBlock name="ChartArea" className={className} {...attributes}>
      <ChartVisualization name="ChartArea" data={data} />
    </StructuredBlock>
  );
}
