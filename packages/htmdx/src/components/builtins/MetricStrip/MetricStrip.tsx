import { parseComponentBody } from '../../body-contracts';
import { MetricStripItems } from '../shared/metrics';
import { StructuredBlock, type StructuredBodyProps } from '../shared/structured';

export function MetricStrip({ body = '', className, ...attributes }: StructuredBodyProps) {
  const items = parseComponentBody('MetricStrip', 'label-value-list', body);
  return (
    <StructuredBlock name="MetricStrip" className={className} {...attributes}>
      <MetricStripItems items={items} />
    </StructuredBlock>
  );
}
