import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { QueryResult } from '@/services/analytics/query';
import { useChartShape } from './useChartShape';
import { WqlEmptyState } from './WqlEmptyState';
import { mergeSeries, formatTimestamp, tooltipTimestamp } from './chartData';
import { SERIES_COLORS } from './chartPalette';

export interface StackedBarProps {
  result: QueryResult;
  unit?: string;
}

const INTENSITY_ORDER = ['low', 'moderate', 'high'];

export function StackedBar({ result, unit }: StackedBarProps) {
  const shape = useChartShape(result);
  const data = useMemo(() => mergeSeries(result.series), [result]);

  const keys = useMemo(() => {
    const labels = result.series.map((s) => s.label);
    return labels.sort((a, b) => {
      const ai = INTENSITY_ORDER.indexOf(a);
      const bi = INTENSITY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [result]);

  if (shape.kind !== 'timeseries' && shape.kind !== 'bars') {
    return <WqlEmptyState result={result} />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
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
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {keys.map((k) => {
          const index = result.series.findIndex((s) => s.label === k);
          return (
            <Bar
              key={k}
              dataKey={k}
              stackId="a"
              fill={SERIES_COLORS[index >= 0 ? index % SERIES_COLORS.length : 0]}
            />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
