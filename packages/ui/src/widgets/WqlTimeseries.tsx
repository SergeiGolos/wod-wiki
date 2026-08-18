import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { QueryResult } from '@bitcobblers/wod-wiki-engine';
import { useChartShape } from './useChartShape';
import { WqlEmptyState } from './WqlEmptyState';
import { mergeSeries, formatTimestamp, tooltipTimestamp } from './chartData';
import { SERIES_COLORS } from './chartPalette';

export interface WqlTimeseriesProps {
  result: QueryResult;
  unit?: string;
}

export function WqlTimeseries({ result, unit: unitProp }: WqlTimeseriesProps) {
  const shape = useChartShape(result);
  const data = useMemo(() => mergeSeries(result.series), [result]);
  const unit = result.series[0]?.unit ?? unitProp;

  if (shape.kind !== 'timeseries' && shape.kind !== 'scalar') {
    return <WqlEmptyState result={result} />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="ts"
          tickFormatter={formatTimestamp}
          tickLine={false}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          stroke="hsl(var(--muted-foreground))"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          stroke="hsl(var(--muted-foreground))"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          unit={unit ? ` ${unit}` : ''}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            borderColor: 'hsl(var(--border))',
            fontSize: '12px',
            color: 'hsl(var(--popover-foreground))',
          }}
          labelFormatter={(v) => tooltipTimestamp(v as number)}
          formatter={(v) => [`${Number(v).toLocaleString()} ${unit ?? ''}`.trim(), '']}
        />
        {result.series.length > 1 && (
          <Legend wrapperStyle={{ fontSize: 11 }} />
        )}
        {result.series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.label}
            name={s.label}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
