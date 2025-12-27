import React from 'react';
import { CollectionSpan } from '../../core/models/CollectionSpan';
import type { ICodeFragment } from '../../core/models/CodeFragment';

interface MetricAnchorProps {
  span?: CollectionSpan;
  sourceId?: number;
  metricType?: string;
  aggregator?: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

// Helper to extract numeric values from fragments
const extractFragmentValue = (fragment: ICodeFragment): number | undefined => {
  const value = fragment.value as { amount?: number; value?: number } | number | undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null) {
    return value.amount ?? value.value;
  }
  return undefined;
};

const aggregateFragments = (
  fragments: ICodeFragment[][] | undefined, 
  metricType?: string, 
  aggregator: 'sum' | 'avg' | 'min' | 'max' | 'count' = 'sum'
) => {
  if (!fragments || fragments.length === 0) return 0;
  
  const allFragments = fragments.flat();
  const filtered = metricType 
    ? allFragments.filter(f => f.type === metricType) 
    : allFragments;
  
  const values = filtered
    .map(f => extractFragmentValue(f))
    .filter((v): v is number => v !== undefined);

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

export const MetricAnchor: React.FC<MetricAnchorProps> = ({ span, sourceId: _sourceId, metricType, aggregator }) => {
  if (!span) {
    return <div>-</div>;
  }

  const aggregatedValue = aggregateFragments(span.fragments, metricType, aggregator);

  return (
    <div>
      {aggregatedValue}
    </div>
  );
};
