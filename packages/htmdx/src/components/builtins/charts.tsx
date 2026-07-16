import type { LabelNumber } from './body-contracts';
import { parseComponentBody } from './body-contracts';
import { Block, rawBody, type RawBodyProps } from './shell';
import type { HtmdxComponent } from './types';

function truncateLabel(value: string) {
  return value.length > 22 ? `${value.slice(0, 19)}...` : value;
}

// The four chart built-ins share one non-negative bar visualization (as they
// did in the string runtime); axis, bars, and labels are theme-token driven.
function BarChart({ name, data }: { name: string; data: LabelNumber[] }) {
  const max = Math.max(...data.map((datum) => datum.value), 1);
  const chartWidth = 640;
  const chartHeight = 240;
  const paddingX = 34;
  const axisY = 206;
  const slotWidth = (chartWidth - paddingX * 2) / data.length;
  const barWidth = Math.max(28, Math.min(72, slotWidth * 0.68));

  return (
    <Block name={name}>
      <div className="w-full overflow-x-auto rounded-lg border bg-card p-4">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label={`${name} chart`}
          className="w-full"
        >
          <line
            className="stroke-border"
            x1={paddingX}
            y1={axisY}
            x2={chartWidth - paddingX}
            y2={axisY}
          />
          {data.map((datum, index) => {
            const height = (datum.value / max) * 172;
            const x = paddingX + index * slotWidth + (slotWidth - barWidth) / 2;
            const y = axisY - height;
            return (
              <g key={index}>
                <rect className="fill-primary" x={x} y={y} width={barWidth} height={height} rx={7}>
                  <title>{`${datum.label}: ${datum.value}`}</title>
                </rect>
                <text
                  className="fill-muted-foreground text-[11px]"
                  x={x + barWidth / 2}
                  y={234}
                  textAnchor="middle"
                >
                  {truncateLabel(datum.label)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </Block>
  );
}

function makeChart(name: string) {
  return rawBody(({ body = '' }: RawBodyProps) => {
    const data = parseComponentBody(name, 'label-number-list', body);
    return <BarChart name={name} data={data} />;
  }, name);
}

export const ChartBar = makeChart('ChartBar');
export const ChartArea = makeChart('ChartArea');
export const ChartLine = makeChart('ChartLine');
export const ChartPie = makeChart('ChartPie');

export const chartBar = {
  name: 'ChartBar',
  body: 'label-number-list',
  purpose: 'Compare non-negative numeric values with a bar chart.',
  example: '<ChartBar>\n- Free users: 48\n- Paid users: 12\n</ChartBar>',
  component: ChartBar,
} satisfies HtmdxComponent;

export const chartArea = {
  name: 'ChartArea',
  body: 'label-number-list',
  purpose:
    'Compare non-negative numeric values; currently rendered with the shared bar-chart visualization.',
  example: '<ChartArea>\n- January: 18\n- February: 27\n</ChartArea>',
  component: ChartArea,
} satisfies HtmdxComponent;

export const chartLine = {
  name: 'ChartLine',
  body: 'label-number-list',
  purpose:
    'Compare non-negative numeric values; currently rendered with the shared bar-chart visualization.',
  example: '<ChartLine>\n- Week 1: 8\n- Week 2: 13\n</ChartLine>',
  component: ChartLine,
} satisfies HtmdxComponent;

export const chartPie = {
  name: 'ChartPie',
  body: 'label-number-list',
  purpose:
    'Compare non-negative numeric values; currently rendered with the shared bar-chart visualization.',
  example: '<ChartPie>\n- Direct: 62\n- Referral: 38\n</ChartPie>',
  component: ChartPie,
} satisfies HtmdxComponent;
