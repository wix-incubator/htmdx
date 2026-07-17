import { parseComponentBody } from '../../components/body-contracts';
import { cn } from '../shadcn/utils';
import { Block, Inline, rawBody, splitFeature, type RawBodyProps } from './shell';
import { toneChip, TONE_BORDER } from './tones';

// Provenance pills: each source artifact a section draws on, prefixed with a
// ↗ glyph. A bold item is the current artifact and renders highlighted (blue)
// so the reader can see where they are in the provenance chain.
export const Sources = rawBody(({ body = '' }: RawBodyProps) => {
  const parsed = parseComponentBody('Sources', 'markdown-list-cards', body);
  return (
    <Block name="Sources">
      <div className="flex flex-wrap gap-2">
        {parsed.items.map((item, index) => {
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
              <Inline text={title ?? text} />
            </span>
          );
        })}
      </div>
    </Block>
  );
}, 'Sources');
