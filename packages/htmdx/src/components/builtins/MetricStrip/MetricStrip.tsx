import { parseComponentBody } from '../../body-contracts';
import { MetricStripItems } from '../shared/metrics';
import { StructuredBlock, type StructuredBodyProps } from '../shared/structured';

export const bodyFormat = 'label-value-list';

export function MetricStrip({ body = '', className, ...attributes }: StructuredBodyProps) {
  const items = parseComponentBody('MetricStrip', bodyFormat, body);
  return (
    <StructuredBlock name="MetricStrip" className={className} {...attributes}>
      <MetricStripItems items={items} />
    </StructuredBlock>
  );
}
