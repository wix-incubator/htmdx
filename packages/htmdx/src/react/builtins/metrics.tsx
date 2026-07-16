import { parseComponentBody } from '../../components/body-contracts';
import { Block, Inline, rawBody, stripWrappingBold, type RawBodyProps } from './shell';

export const MetricStrip = rawBody(({ body = '' }: RawBodyProps) => {
  const items = parseComponentBody('MetricStrip', 'label-value-list', body);
  return (
    <Block name="MetricStrip">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-lg border bg-card px-4 py-3">
            <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <Inline text={item.label} />
            </div>
            <div className="mt-1 text-2xl font-semibold text-card-foreground">
              <Inline text={stripWrappingBold(item.value)} />
            </div>
          </div>
        ))}
      </div>
    </Block>
  );
}, 'MetricStrip');

export const Stat = rawBody(({ body = '' }: RawBodyProps) => {
  const items = parseComponentBody('Stat', 'label-value-list', body);
  return (
    <Block name="Stat">
      <div className="flex flex-wrap gap-8">
        {items.map((item, index) => (
          <div key={index} className="flex flex-col">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              <Inline text={stripWrappingBold(item.value)} />
            </span>
            <span className="text-sm text-muted-foreground">
              <Inline text={item.label} />
            </span>
          </div>
        ))}
      </div>
    </Block>
  );
}, 'Stat');
