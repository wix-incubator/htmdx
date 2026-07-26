import { parseComponentBody } from '../../body-contracts';
import { EvidenceCardGrid } from '../shared/evidence-cards';
import type { StructuredBodyProps } from '../shared/structured';

export const bodyFormat = 'markdown-list-cards';

export function Evidence({ body = '', className, ...attributes }: StructuredBodyProps) {
  const { items } = parseComponentBody('Evidence', bodyFormat, body);
  return (
    <EvidenceCardGrid name="Evidence" items={items} className={className} attributes={attributes} />
  );
}
