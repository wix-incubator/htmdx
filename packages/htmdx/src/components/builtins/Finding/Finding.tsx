import { parseComponentBody } from '../../body-contracts';
import { EvidenceCardGrid } from '../shared/evidence-cards';
import type { StructuredBodyProps } from '../shared/structured';

export const bodyFormat = 'markdown-list-cards';

export function Finding({ body = '', className, ...attributes }: StructuredBodyProps) {
  const { items } = parseComponentBody('Finding', bodyFormat, body);
  return (
    <EvidenceCardGrid name="Finding" items={items} className={className} attributes={attributes} />
  );
}
