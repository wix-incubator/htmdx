import type { LabelNumber } from '../../body-contracts';

function truncateLabel(value: string) {
  return value.length > 22 ? `${value.slice(0, 19)}...` : value;
}

export function ChartVisualization({ name, data }: { name: string; data: LabelNumber[] }) {
  const max = Math.max(...data.map((datum) => datum.value), 1);
  const chartWidth = 640;
  const chartHeight = 240;
  const paddingX = 34;
  const axisY = 206;
  const slotWidth = (chartWidth - paddingX * 2) / data.length;
  const barWidth = Math.max(28, Math.min(72, slotWidth * 0.68));

  return (
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
              <rect
                className="fill-[var(--md-sys-color-primary)]"
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx={7}
              >
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
  );
}
