import { parseComponentBody } from '../../body-contracts';
import { cn } from '../../shadcn/shared/utils';
import { toneChip } from '../shared/tones';
import {
  InlineMarkdown,
  splitFeature,
  StructuredBlock,
  type StructuredBodyProps,
} from '../shared/structured';

export function Sources({ body = '', className, ...attributes }: StructuredBodyProps) {
  const { items } = parseComponentBody('Sources', 'markdown-list-cards', body);
  // Emphasized (**bold**) sources are intentionally dropped; only plain (grey)
  // sources render as chips.
  const sources = items.filter((item) => !item.trimStart().startsWith('**'));
  return (
    <StructuredBlock name="Sources" className={className} {...attributes}>
      {/* mb-[6px]! wins over the section-card `p` rule (margin 0 0 0.75rem). */}
      <p className="mb-[6px]! text-sm text-muted-foreground">Sources:</p>
      <div className="flex flex-wrap gap-2">
        {sources.map((item, index) => {
          const { text } = splitFeature(item);
          return (
            <span
              key={index}
              className={cn(
                toneChip({ tone: 'gray', emphasis: 'outline' }),
                // Border matches the text color (muted-foreground) at 70%
                // opacity, rather than the default lighter --border.
                'border-muted-foreground/70 px-2.5 py-0.5 text-xs font-medium tracking-normal',
              )}
            >
              <span aria-hidden className="text-[10px] leading-none">
                ↗
              </span>
              <InlineMarkdown text={text} />
            </span>
          );
        })}
      </div>
    </StructuredBlock>
  );
}
