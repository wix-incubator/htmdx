import { parseComponentBody } from '../../body-contracts';
import { EvidenceCardGrid } from '../shared/evidence-cards';
import type { StructuredBodyProps } from '../shared/structured';

export function Finding({ body = '', className, ...attributes }: StructuredBodyProps) {
  const { items } = parseComponentBody('Finding', 'markdown-list-cards', body);
  return (
    <EvidenceCardGrid name="Finding" items={items} className={className} attributes={attributes} />
  );
}
