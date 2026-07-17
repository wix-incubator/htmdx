import { parseComponentBody } from '../../components/body-contracts';
import { cn } from '../shadcn/utils';
import { Block, Inline, rawBody, splitFeature, type RawBodyProps } from './shell';
import { toneChip, TONE_BORDER, TONE_SOFT, type Tone } from './tones';

// Open questions & assumptions: an amber-framed panel whose rows each carry a
// labeled badge. Item: **Assumption:** text · **Risk:** text · **Open:** text.
const LABEL_TONES: Record<string, Tone> = {
  assumption: 'blue',
  risk: 'red',
  open: 'amber',
  question: 'amber',
};

function labelToneOf(label: string): Tone {
  return LABEL_TONES[label.trim().toLowerCase()] ?? 'gray';
}

export const OpenQuestions = rawBody(({ body = '' }: RawBodyProps) => {
  const parsed = parseComponentBody('OpenQuestions', 'markdown-list-cards', body);
  return (
    <Block name="OpenQuestions">
      <div className={cn('overflow-hidden rounded-lg border', TONE_BORDER.amber)}>
        <div
          className={cn(
            'border-b px-4 py-2 text-sm font-semibold',
            TONE_BORDER.amber,
            TONE_SOFT.amber,
          )}
        >
          ⚠ Open Questions &amp; Assumptions
        </div>
        <div className="divide-y">
          {parsed.items.map((item, index) => {
            const { title, text } = splitFeature(item);
            return (
              <div key={index} className="flex items-start gap-3 px-4 py-3">
                <span className={toneChip({ tone: labelToneOf(title ?? ''), emphasis: 'soft' })}>
                  {(title ?? 'Note').toUpperCase()}
                </span>
                <span className="text-sm text-muted-foreground">
                  <Inline text={text} />
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Block>
  );
}, 'OpenQuestions');
