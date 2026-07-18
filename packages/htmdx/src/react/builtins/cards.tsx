import { parseComponentBody } from '../../components/body-contracts';
import { Block, Inline, rawBody, splitFeature, type RawBodyProps } from './shell';

// Compare / Finding / Evidence share a `**Title:** text` card grid.
function FeatureGrid({ name, items }: { name: string; items: string[] }) {
  return (
    <Block name={name}>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => {
          const { title, text } = splitFeature(item);
          return (
            <div key={index} className="rounded-lg border bg-card p-4">
              {title ? (
                <div className="font-semibold text-card-foreground">
                  <Inline text={title} />
                </div>
              ) : null}
              <div className="text-sm text-muted-foreground">
                <Inline text={text} />
              </div>
            </div>
          );
        })}
      </div>
    </Block>
  );
}

function makeFeatureGrid(name: string) {
  return rawBody(({ body = '' }: RawBodyProps) => {
    const parsed = parseComponentBody(name, 'markdown-list-cards', body);
    return <FeatureGrid name={name} items={parsed.items} />;
  }, name);
}

export const Compare = makeFeatureGrid('Compare');
export const Finding = makeFeatureGrid('Finding');
export const Evidence = makeFeatureGrid('Evidence');
