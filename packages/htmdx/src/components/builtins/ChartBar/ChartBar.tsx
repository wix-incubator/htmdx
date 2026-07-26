import { parseComponentBody } from '../../body-contracts';
import { ChartVisualization } from '../shared/charts';
import { StructuredBlock, type StructuredBodyProps } from '../shared/structured';

export const bodyFormat = 'label-number-list';

export function ChartBar({ body = '', className, ...attributes }: StructuredBodyProps) {
  const data = parseComponentBody('ChartBar', bodyFormat, body);
  return (
    <StructuredBlock name="ChartBar" className={className} {...attributes}>
      <ChartVisualization name="ChartBar" data={data} />
    </StructuredBlock>
  );
}
