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
  return (
    <StructuredBlock name="Sources" className={className} {...attributes}>
      {/* mb-[6px]! wins over the section-card `p` rule (margin 0 0 0.75rem). */}
      <p className="mb-[6px]! text-sm text-muted-foreground">Sources:</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => {
          const highlighted = item.trimStart().startsWith('**');
          const { title, text } = splitFeature(item);
          return (
            <span
              key={index}
              className={
                highlighted
                  ? cn(
                      'inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-normal whitespace-nowrap',
                      // Icon + text follow the active theme's primary color; the
                      // border is the same primary at 70% opacity (30% more
                      // transparent) over a transparent background.
                      'bg-transparent text-[var(--md-sys-color-primary)]',
                      'border-[color-mix(in_oklab,var(--md-sys-color-primary)_70%,transparent)]',
                    )
                  : cn(
                      toneChip({ tone: 'gray', emphasis: 'outline' }),
                      'px-2.5 py-0.5 text-xs font-medium tracking-normal',
                    )
              }
            >
              <span aria-hidden className="text-[10px]">
                ↗
              </span>
              <InlineMarkdown text={title ?? text} />
            </span>
          );
        })}
      </div>
    </StructuredBlock>
  );
}
