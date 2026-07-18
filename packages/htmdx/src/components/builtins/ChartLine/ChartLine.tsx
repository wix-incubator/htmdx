import { parseComponentBody } from '../../body-contracts';
import { ChartVisualization } from '../shared/charts';
import { StructuredBlock, type StructuredBodyProps } from '../shared/structured';

export function ChartLine({ body = '', className, ...attributes }: StructuredBodyProps) {
  const data = parseComponentBody('ChartLine', 'label-number-list', body);
  return (
    <StructuredBlock name="ChartLine" className={className} {...attributes}>
      <ChartVisualization name="ChartLine" data={data} />
    </StructuredBlock>
  );
}
