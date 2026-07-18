import { parseComponentBody } from '../../body-contracts';
import { EvidenceCardGrid } from '../shared/evidence-cards';
import type { StructuredBodyProps } from '../shared/structured';

export function Compare({ body = '', className, ...attributes }: StructuredBodyProps) {
  const { items } = parseComponentBody('Compare', 'markdown-list-cards', body);
  return (
    <EvidenceCardGrid name="Compare" items={items} className={className} attributes={attributes} />
  );
}
