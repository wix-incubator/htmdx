import { parseComponentBody } from '../../body-contracts';
import { cn } from '../../../react/shadcn/utils';
import { toneChip, TONE_BORDER } from '../../../react/builtins/tones';
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
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => {
          const highlighted = item.trimStart().startsWith('**');
          const { title, text } = splitFeature(item);
          return (
            <span
              key={index}
              className={cn(
                toneChip({
                  tone: highlighted ? 'blue' : 'gray',
                  emphasis: highlighted ? 'soft' : 'outline',
                }),
                'px-3 py-1 text-sm font-medium tracking-normal',
                highlighted && TONE_BORDER.blue,
              )}
            >
              <span aria-hidden className="text-xs">
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
