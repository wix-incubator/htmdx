import { parseComponentBody } from '../../body-contracts';
import { StatItems } from '../shared/metrics';
import { StructuredBlock, type StructuredBodyProps } from '../shared/structured';

export const bodyFormat = 'label-value-list';

export function Stat({ body = '', className, ...attributes }: StructuredBodyProps) {
  const items = parseComponentBody('Stat', bodyFormat, body);
  return (
    <StructuredBlock name="Stat" className={className} {...attributes}>
      <StatItems items={items} />
    </StructuredBlock>
  );
}
