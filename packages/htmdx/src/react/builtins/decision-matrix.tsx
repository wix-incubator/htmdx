import { parseComponentBody } from '../../components/body-contracts';
import { cn } from '../shadcn/utils';
import { Block, Inline, rawBody, type RawBodyProps } from './shell';
import { toneChip, TONE_DOT, TONE_SURFACE, type Tone } from './tones';

// Options-as-columns decision matrix. The gfm-table header lists the options
// (first cell is the criteria corner); mark the chosen option by putting a ✓
// in its header cell — that column is highlighted and gets a "Chosen" badge.
// Any cell may lead with a `[green]` / `[amber]` / `[red]` marker to show a
// colored effort dot (e.g. Build Effort: easy → hard).
function splitDot(cell: string): { tone?: Tone; text: string } {
  const match = cell.match(/^\s*\[(blue|green|amber|red|gray|purple)\]\s*([\s\S]*)$/i);
  if (!match) return { text: cell };
  return { tone: match[1].toLowerCase() as Tone, text: match[2] };
}

function isChosen(headerCell: string): boolean {
  return headerCell.includes('✓');
}

function Cell({ raw }: { raw: string }) {
  const { tone, text } = splitDot(raw);
  return (
    <span className="inline-flex items-baseline gap-1.5">
      {tone ? (
        <span aria-hidden className={cn('text-xs', TONE_DOT[tone])}>
          ●
        </span>
      ) : null}
      <span>
        <Inline text={text} />
      </span>
    </span>
  );
}

export const DecisionMatrix = rawBody(({ body = '' }: RawBodyProps) => {
  const table = parseComponentBody('DecisionMatrix', 'gfm-table', body);
  const [corner = '', ...optionHeaders] = table.header;
  const chosenCol = optionHeaders.findIndex(isChosen);

  return (
    <Block name="DecisionMatrix">
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full border-collapse text-sm" style={{ margin: 0 }}>
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="p-3 text-left align-top font-medium text-muted-foreground">
                <Inline text={corner} />
              </th>
              {optionHeaders.map((header, index) => {
                const chosen = index === chosenCol;
                return (
                  <th
                    key={index}
                    className={cn(
                      'p-3 text-left align-top font-semibold text-foreground',
                      chosen && TONE_SURFACE.blue,
                    )}
                  >
                    <div>
                      <Inline text={header.replace('✓', '').trim()} />
                    </div>
                    {chosen ? (
                      <span
                        className={cn(
                          toneChip({ tone: 'blue', emphasis: 'soft' }),
                          'mt-1 normal-case',
                        )}
                      >
                        ✓ Chosen
                      </span>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => {
              const [label = '', ...cells] = row;
              return (
                <tr key={rowIndex} className="border-b last:border-0">
                  <th className="p-3 text-left align-top font-semibold text-foreground">
                    <Inline text={label} />
                  </th>
                  {cells.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={cn(
                        'p-3 align-top text-muted-foreground',
                        cellIndex === chosenCol && TONE_SURFACE.blue,
                      )}
                    >
                      <Cell raw={cell} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Block>
  );
}, 'DecisionMatrix');
