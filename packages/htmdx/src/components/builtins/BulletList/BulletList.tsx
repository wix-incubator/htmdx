import { parseComponentBody } from '../../body-contracts';
import { InlineMarkdown, StructuredBlock, type StructuredBodyProps } from '../shared/structured';

// Each row is `link - text`: the part before the first " - " renders as a
// primary-colored, underlined link; the rest renders as plain text.
function splitBullet(item: string): { link: string; text: string } {
  const sep = item.indexOf(' - ');
  if (sep === -1) return { link: item.trim(), text: '' };
  return { link: item.slice(0, sep).trim(), text: item.slice(sep + 3).trim() };
}

export function BulletList({ body = '', className, ...attributes }: StructuredBodyProps) {
  const { items } = parseComponentBody('BulletList', 'markdown-list-cards', body);
  return (
    <StructuredBlock name="BulletList" className={className} {...attributes}>
      <div className="w-full rounded-lg border bg-card p-4">
        {/* mb-0! overrides the section-card `ul` rule's 0.75rem bottom margin. */}
        <ul className="mb-0! flex list-disc flex-col gap-1.5 pl-5 text-sm">
          {items.map((item, index) => {
            const { link, text } = splitBullet(item);
            return (
              <li key={index} className="text-card-foreground marker:text-muted-foreground">
                <span className="font-bold text-[var(--md-sys-color-primary)] underline">
                  <InlineMarkdown text={link} />
                </span>
                {text ? (
                  <span className="text-muted-foreground">
                    {' '}
                    - <InlineMarkdown text={text} />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </StructuredBlock>
  );
}
