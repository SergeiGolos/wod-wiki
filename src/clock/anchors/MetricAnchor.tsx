import React from 'react';
import { CollectionSpan, Metric } from '../../CollectionSpan';

interface MetricAnchorProps {
  span?: CollectionSpan;
  sourceId?: number;
  metricType?: string;
  aggregator?: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

const aggregateMetrics = (metrics: Metric[], sourceId?: number, metricType?: string, aggregator: 'sum' | 'avg' | 'min' | 'max' | 'count' = 'sum') => {
  let filteredMetrics = metrics;

  if (sourceId) {
    filteredMetrics = filteredMetrics.filter(m => m.sourceId === sourceId);
  }

  const values = filteredMetrics.flatMap(m => m.values.filter(v => !metricType || v.type === metricType).map(v => v.value));

  if (values.length === 0) {
    return 0;
  }

  switch (aggregator) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'count':
      return values.length;
    default:
      return 0;
  }
};

export const MetricAnchor: React.FC<MetricAnchorProps> = ({ span, sourceId, metricType, aggregator }) => {
  if (!span) {
    return <div>-</div>;
  }

  const aggregatedValue = aggregateMetrics(span.metrics, sourceId, metricType, aggregator);

  return (
    <div>
      {aggregatedValue}
    </div>
  );
};
